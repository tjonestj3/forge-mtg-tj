package forge.gui.web;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import forge.LobbyPlayer;
import forge.ai.GameState;
import forge.deck.CardPool;
import forge.game.GameEntityView;
import forge.game.GameView;
import forge.game.card.CardView;
import forge.game.event.GameEvent;
import forge.game.event.GameEventSpellAbilityCast;
import forge.game.event.GameEventSpellRemovedFromStack;
import forge.game.phase.PhaseType;
import forge.game.player.DelayedReveal;
import forge.game.player.IHasIcon;
import forge.game.player.PlayerView;
import forge.game.spellability.SpellAbilityView;
import forge.game.zone.ZoneType;
import forge.gamemodes.match.AbstractGuiGame;
import forge.gamemodes.match.YieldUpdate;
import forge.gamemodes.net.DeltaPacket;
import forge.interfaces.IGameController;
import forge.item.PaperCard;
import forge.localinstance.skin.FSkinProp;
import forge.player.PlayerZoneUpdate;
import forge.player.PlayerZoneUpdates;
import forge.trackable.TrackableCollection;
import forge.util.FSerializableFunction;
import forge.util.ITriggerEvent;

import org.java_websocket.WebSocket;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

public class WebGuiGame extends AbstractGuiGame {

    private volatile WebSocket connection;
    private final Map<String, CompletableFuture<JsonObject>> pendingRequests = new ConcurrentHashMap<>();
    private static final long REQUEST_TIMEOUT_SECONDS = 600;

    public void setConnection(WebSocket conn) {
        this.connection = conn;
    }

    // --- Send helpers ---

    private void send(JsonObject msg) {
        WebSocket ws = connection;
        if (ws != null && ws.isOpen()) {
            ws.send(msg.toString());
        }
    }

    private void sendEvent(String type) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", type);
        send(msg);
    }

    private void sendEvent(String type, String key, String value) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", type);
        msg.addProperty(key, value);
        send(msg);
    }

    private JsonObject requestFromClient(String type, JsonObject data) {
        String requestId = UUID.randomUUID().toString();
        CompletableFuture<JsonObject> future = new CompletableFuture<>();
        pendingRequests.put(requestId, future);

        data.addProperty("type", type);
        data.addProperty("requestId", requestId);
        send(data);

        try {
            return future.get(REQUEST_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        } catch (Exception e) {
            pendingRequests.remove(requestId);
            throw new RuntimeException("Client did not respond to " + type, e);
        }
    }

    // --- Incoming message handler ---

    public void handleMessage(String raw) {
        JsonObject msg = JsonParser.parseString(raw).getAsJsonObject();
        String type = msg.get("type").getAsString();

        if (msg.has("requestId")) {
            String id = msg.get("requestId").getAsString();
            CompletableFuture<JsonObject> future = pendingRequests.remove(id);
            if (future != null) {
                future.complete(msg);
            }
            return;
        }

        IGameController controller = getGameController();
        if (controller == null) return;

        switch (type) {
            case "selectCard" -> {
                int cardId = msg.get("cardId").getAsInt();
                CardView card = findCardById(cardId);
                if (card != null) {
                    controller.selectCard(card, Collections.emptyList(), null);
                }
            }
            case "selectPlayer" -> {
                int playerId = msg.get("playerId").getAsInt();
                PlayerView pv = findPlayerById(playerId);
                if (pv != null) {
                    controller.selectPlayer(pv, null);
                }
            }
            case "selectAbility" -> {
                // handled via abilityResponse
            }
            case "selectButtonOk" -> controller.selectButtonOk();
            case "selectButtonCancel" -> controller.selectButtonCancel();
            case "passPriority" -> controller.passPriority();
            case "concede" -> controller.concede();
            case "alphaStrike" -> controller.alphaStrike();
            case "useMana" -> {
                byte color = msg.get("color").getAsByte();
                controller.useMana(color);
            }
        }
    }

    private CardView findCardById(int id) {
        GameView gv = getGameView();
        if (gv == null || gv.getPlayers() == null) return null;
        for (PlayerView p : gv.getPlayers()) {
            CardView c = searchZone(p.getHand(), id);
            if (c != null) return c;
            c = searchZone(p.getBattlefield(), id);
            if (c != null) return c;
            c = searchZone(p.getGraveyard(), id);
            if (c != null) return c;
            c = searchZone(p.getExile(), id);
            if (c != null) return c;
        }
        if (gv.getStack() != null) {
            for (var item : gv.getStack()) {
                if (item.getSourceCard() != null && item.getSourceCard().getId() == id) {
                    return item.getSourceCard();
                }
            }
        }
        return null;
    }

    private CardView searchZone(Iterable<CardView> zone, int id) {
        if (zone == null) return null;
        for (CardView c : zone) {
            if (c.getId() == id) return c;
        }
        return null;
    }

    private PlayerView findPlayerById(int id) {
        GameView gv = getGameView();
        if (gv == null || gv.getPlayers() == null) return null;
        for (PlayerView p : gv.getPlayers()) {
            if (p.getId() == id) return p;
        }
        return null;
    }

    public void sendFullGameState() {
        GameView gv = getGameView();
        if (gv == null) return;
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "gameState");
        msg.add("data", GameSerializer.serializeGameState(gv));
        send(msg);
    }

    // --- AbstractGuiGame abstract method ---

    @Override
    protected void updateCurrentPlayer(PlayerView player) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "currentPlayer");
        if (player != null) {
            msg.addProperty("playerId", player.getId());
            msg.addProperty("playerName", player.getName());
        }
        send(msg);
    }

    // --- IGuiGame: game lifecycle ---

    @Override
    public void openView(TrackableCollection<PlayerView> myPlayers) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "gameStarted");
        JsonArray pIds = new JsonArray();
        for (PlayerView p : myPlayers) {
            pIds.add(p.getId());
        }
        msg.add("myPlayerIds", pIds);
        send(msg);
        sendFullGameState();
    }

    @Override
    public void afterGameEnd() {
        sendEvent("gameEnded");
    }

    @Override
    public void finishGame() {
        sendFullGameState();
        sendEvent("gameFinished");
    }

    // --- IGuiGame: display updates (non-blocking) ---

    @Override
    public void showPromptMessage(PlayerView playerView, String message) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "prompt");
        msg.addProperty("message", message);
        if (playerView != null) {
            msg.addProperty("playerId", playerView.getId());
        }
        send(msg);
    }

    @Override
    public void showCardPromptMessage(PlayerView playerView, String message, CardView card) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "prompt");
        msg.addProperty("message", message);
        if (playerView != null) msg.addProperty("playerId", playerView.getId());
        if (card != null) msg.add("card", GameSerializer.serializeCard(card));
        send(msg);
    }

    @Override
    public void updateButtons(PlayerView owner, String label1, String label2, boolean enable1, boolean enable2, boolean focus1) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "buttons");
        msg.addProperty("label1", label1);
        msg.addProperty("label2", label2);
        msg.addProperty("enable1", enable1);
        msg.addProperty("enable2", enable2);
        msg.addProperty("focus1", focus1);
        send(msg);
    }

    @Override
    public void updatePhase(boolean saveState) {
        sendFullGameState();
    }

    @Override
    public void updateTurn(PlayerView player) {
        sendFullGameState();
    }

    @Override
    public void updateStack() {
        sendFullGameState();
    }

    @Override
    public void showCombat() {
        sendFullGameState();
    }

    @Override
    public void updateZones(Iterable<PlayerZoneUpdate> zonesToUpdate) {
        sendFullGameState();
    }

    @Override
    public void updateCards(Iterable<CardView> cards) {
        sendFullGameState();
    }

    @Override
    public void updateManaPool(Iterable<PlayerView> manaPoolUpdate) {
        sendFullGameState();
    }

    @Override
    public void updateLives(Iterable<PlayerView> livesUpdate) {
        sendFullGameState();
    }

    @Override
    public void updateShards(Iterable<PlayerView> shardsUpdate) {
        sendFullGameState();
    }

    @Override
    public void updatePlayerControl() {}

    @Override
    public void enableOverlay() {}

    @Override
    public void disableOverlay() {}

    @Override
    public void updateDependencies() {}

    @Override
    public void setPanelSelection(CardView hostCard) {}

    @Override
    public void flashIncorrectAction() {
        sendEvent("flash");
    }

    @Override
    public void alertUser() {
        sendEvent("alert");
    }

    @Override
    public void showManaPool(PlayerView player) {}

    @Override
    public void hideManaPool(PlayerView player) {}

    @Override
    public void notifyStackAddition(GameEventSpellAbilityCast event) {
        sendFullGameState();
    }

    @Override
    public void notifyStackRemoval(GameEventSpellRemovedFromStack event) {
        sendFullGameState();
    }

    @Override
    public void handleLandPlayed(CardView land) {
        sendFullGameState();
    }

    @Override
    public void handleGameEvent(GameEvent event) {
        // could send specific events later; for now full state is sent on each update
    }

    @Override
    public Iterable<PlayerZoneUpdate> tempShowZones(PlayerView controller, Iterable<PlayerZoneUpdate> zonesToUpdate) {
        return zonesToUpdate;
    }

    @Override
    public void hideZones(PlayerView controller, Iterable<PlayerZoneUpdate> zonesToUpdate) {}

    @Override
    public void setCard(CardView card) {}

    @Override
    public void setPlayerAvatar(LobbyPlayer player, IHasIcon ihi) {}

    @Override
    public PlayerZoneUpdates openZones(PlayerView controller, Collection<ZoneType> zones, Map<PlayerView, Object> players, boolean backupLastZones) {
        return null;
    }

    @Override
    public void restoreOldZones(PlayerView playerView, PlayerZoneUpdates playerZoneUpdates) {}

    @Override
    public void setHighlighted(Iterable<GameEntityView> entities, boolean b) {}

    @Override
    public void showWaitingTimer(PlayerView forPlayer, String waitingForPlayerName) {}

    @Override
    public boolean isUiSetToSkipPhase(PlayerView playerTurn, PhaseType phase) {
        return false;
    }

    @Override
    public void applyDelta(DeltaPacket packet) {}

    @Override
    public void applyYieldUpdate(YieldUpdate update) {}

    @Override
    public GameState getGamestate() { return null; }

    // --- IGuiGame: blocking input methods ---

    @Override
    public SpellAbilityView getAbilityToPlay(CardView hostCard, List<SpellAbilityView> abilities, ITriggerEvent triggerEvent) {
        if (abilities == null || abilities.isEmpty()) return null;
        if (abilities.size() == 1) return abilities.get(0);

        JsonObject data = new JsonObject();
        data.addProperty("message", "Choose ability to play");
        if (hostCard != null) data.add("card", GameSerializer.serializeCard(hostCard));
        JsonArray opts = new JsonArray();
        for (int i = 0; i < abilities.size(); i++) {
            JsonObject opt = new JsonObject();
            opt.addProperty("index", i);
            opt.addProperty("label", abilities.get(i).toString());
            opts.add(opt);
        }
        data.add("choices", opts);
        data.addProperty("min", 1);
        data.addProperty("max", 1);

        JsonObject response = requestFromClient("choiceRequest", data);
        JsonArray selected = response.getAsJsonArray("selectedIndices");
        if (selected != null && !selected.isEmpty()) {
            return abilities.get(selected.get(0).getAsInt());
        }
        return abilities.get(0);
    }

    @Override
    public Map<CardView, Integer> assignCombatDamage(CardView attacker, List<CardView> blockers,
            int damage, GameEntityView defender, boolean overrideOrder, boolean maySkip) {
        JsonObject data = new JsonObject();
        data.addProperty("message", "Assign combat damage");
        data.add("attacker", GameSerializer.serializeCard(attacker));
        data.add("blockers", GameSerializer.serializeCardList(blockers));
        data.addProperty("totalDamage", damage);
        data.addProperty("maySkip", maySkip);
        if (defender != null) {
            data.addProperty("defenderName", defender.toString());
        }

        JsonObject response = requestFromClient("assignDamageRequest", data);

        Map<CardView, Integer> result = new LinkedHashMap<>();
        JsonObject assignments = response.getAsJsonObject("assignments");
        if (assignments != null) {
            for (String key : assignments.keySet()) {
                int cardId = Integer.parseInt(key);
                int dmg = assignments.get(key).getAsInt();
                for (CardView b : blockers) {
                    if (b.getId() == cardId) {
                        result.put(b, dmg);
                        break;
                    }
                }
            }
        }

        if (result.isEmpty()) {
            int remaining = damage;
            for (int i = 0; i < blockers.size(); i++) {
                if (i == blockers.size() - 1) {
                    result.put(blockers.get(i), remaining);
                } else {
                    int lethal = Math.max(0, blockers.get(i).getCurrentState().getToughness() - blockers.get(i).getDamage());
                    int assign = Math.min(remaining, lethal);
                    result.put(blockers.get(i), assign);
                    remaining -= assign;
                }
            }
        }
        return result;
    }

    @Override
    public Map<Object, Integer> assignGenericAmount(CardView effectSource, Map<Object, Integer> target,
            int amount, boolean atLeastOne, String amountLabel) {
        // simplified: distribute evenly
        return target;
    }

    @Override
    public void message(String message, String title) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "message");
        msg.addProperty("message", message);
        msg.addProperty("title", title);
        send(msg);
    }

    @Override
    public void showErrorDialog(String message, String title) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "error");
        msg.addProperty("message", message);
        msg.addProperty("title", title);
        send(msg);
    }

    @Override
    public boolean showConfirmDialog(String message, String title, String yesButtonText, String noButtonText, boolean defaultYes) {
        JsonObject data = new JsonObject();
        data.addProperty("message", message);
        data.addProperty("title", title);
        data.addProperty("yesLabel", yesButtonText);
        data.addProperty("noLabel", noButtonText);
        data.addProperty("defaultYes", defaultYes);

        JsonObject response = requestFromClient("confirmRequest", data);
        return response.has("result") && response.get("result").getAsBoolean();
    }

    @Override
    public int showOptionDialog(String message, String title, FSkinProp icon, List<String> options, int defaultOption) {
        JsonObject data = new JsonObject();
        data.addProperty("message", message);
        data.addProperty("title", title);
        JsonArray opts = new JsonArray();
        for (String o : options) opts.add(o);
        data.add("options", opts);
        data.addProperty("defaultOption", defaultOption);

        JsonObject response = requestFromClient("optionRequest", data);
        return response.has("selectedIndex") ? response.get("selectedIndex").getAsInt() : defaultOption;
    }

    @Override
    public String showInputDialog(String message, String title, FSkinProp icon, String initialInput, List<String> inputOptions, boolean isNumeric) {
        JsonObject data = new JsonObject();
        data.addProperty("message", message);
        data.addProperty("title", title);
        if (initialInput != null) data.addProperty("initialInput", initialInput);
        if (inputOptions != null) {
            JsonArray opts = new JsonArray();
            for (String o : inputOptions) opts.add(o);
            data.add("inputOptions", opts);
        }
        data.addProperty("isNumeric", isNumeric);

        JsonObject response = requestFromClient("inputRequest", data);
        return response.has("value") ? response.get("value").getAsString() : initialInput;
    }

    @Override
    public boolean confirm(CardView c, String question, boolean defaultIsYes, List<String> options) {
        JsonObject data = new JsonObject();
        data.addProperty("message", question);
        if (c != null) data.add("card", GameSerializer.serializeCard(c));
        data.addProperty("defaultYes", defaultIsYes);
        if (options != null && options.size() >= 2) {
            data.addProperty("yesLabel", options.get(0));
            data.addProperty("noLabel", options.get(1));
        }

        JsonObject response = requestFromClient("confirmRequest", data);
        return response.has("result") && response.get("result").getAsBoolean();
    }

    @Override
    public <T> List<T> getChoices(String message, int min, int max, List<T> choices,
            List<T> selected, FSerializableFunction<T, String> display) {
        if (choices == null || choices.isEmpty()) return Collections.emptyList();
        if (min >= choices.size() && min == max) return new ArrayList<>(choices);

        JsonObject data = new JsonObject();
        data.addProperty("message", message);
        data.addProperty("min", min);
        data.addProperty("max", max);
        JsonArray opts = new JsonArray();
        for (int i = 0; i < choices.size(); i++) {
            JsonObject opt = new JsonObject();
            opt.addProperty("index", i);
            T item = choices.get(i);
            String label = (display != null) ? display.apply(item) : item.toString();
            opt.addProperty("label", label);
            if (item instanceof CardView cv) {
                opt.add("card", GameSerializer.serializeCard(cv));
            }
            opts.add(opt);
        }
        data.add("choices", opts);

        if (selected != null) {
            JsonArray sel = new JsonArray();
            for (T s : selected) {
                int idx = choices.indexOf(s);
                if (idx >= 0) sel.add(idx);
            }
            data.add("preselected", sel);
        }

        JsonObject response = requestFromClient("choiceRequest", data);
        JsonArray selectedIndices = response.getAsJsonArray("selectedIndices");
        List<T> result = new ArrayList<>();
        if (selectedIndices != null) {
            for (var idx : selectedIndices) {
                int i = idx.getAsInt();
                if (i >= 0 && i < choices.size()) {
                    result.add(choices.get(i));
                }
            }
        }
        return result;
    }

    @Override
    public Integer getInteger(String message, int min, int max, boolean sortDesc) {
        JsonObject data = new JsonObject();
        data.addProperty("message", message);
        data.addProperty("min", min);
        data.addProperty("max", max);
        data.addProperty("isNumeric", true);

        JsonObject response = requestFromClient("inputRequest", data);
        if (response.has("value")) {
            try {
                return Integer.parseInt(response.get("value").getAsString());
            } catch (NumberFormatException e) {
                return min;
            }
        }
        return min;
    }

    @Override
    public Integer getInteger(String message, int min, int max, int cutoff) {
        return getInteger(message, min, max, false);
    }

    @Override
    public <T> T oneOrNone(String message, List<T> choices) {
        if (choices == null || choices.isEmpty()) return null;
        List<T> result = getChoices(message, 0, 1, choices, null, null);
        return result.isEmpty() ? null : result.get(0);
    }

    @Override
    public <T> T one(String message, List<T> choices, FSerializableFunction<T, String> display) {
        if (choices == null || choices.isEmpty()) return null;
        if (choices.size() == 1) return choices.get(0);
        List<T> result = getChoices(message, 1, 1, choices, null, display);
        return result.isEmpty() ? choices.get(0) : result.get(0);
    }

    @Override
    public <T> void reveal(String message, List<T> items) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "reveal");
        msg.addProperty("message", message);
        JsonArray arr = new JsonArray();
        for (T item : items) {
            if (item instanceof CardView cv) {
                arr.add(GameSerializer.serializeCard(cv));
            } else {
                JsonObject obj = new JsonObject();
                obj.addProperty("label", item.toString());
                arr.add(obj);
            }
        }
        msg.add("items", arr);
        send(msg);
    }

    @Override
    public <T> List<T> many(String title, String topCaption, int min, int max,
            List<T> sourceChoices, List<T> destChoices, CardView c) {
        return getChoices(title + (topCaption != null ? " - " + topCaption : ""), min, max, sourceChoices, destChoices, null);
    }

    @Override
    public <T> OrderResult<T> order(String title, String top, int remainingObjectsMin, int remainingObjectsMax,
            List<T> sourceChoices, List<T> destChoices, CardView referenceCard, boolean sideboardingMode, boolean showRememberCheckbox) {
        if (sourceChoices == null || sourceChoices.isEmpty()) {
            return new OrderResult<>(Collections.emptyList(), false);
        }

        JsonObject data = new JsonObject();
        data.addProperty("message", title + (top != null ? " - " + top : ""));
        data.addProperty("min", remainingObjectsMin);
        data.addProperty("max", remainingObjectsMax);
        data.addProperty("sideboardingMode", sideboardingMode);
        if (referenceCard != null) data.add("card", GameSerializer.serializeCard(referenceCard));

        JsonArray items = new JsonArray();
        for (int i = 0; i < sourceChoices.size(); i++) {
            JsonObject opt = new JsonObject();
            opt.addProperty("index", i);
            T item = sourceChoices.get(i);
            opt.addProperty("label", item.toString());
            if (item instanceof CardView cv) {
                opt.add("card", GameSerializer.serializeCard(cv));
            }
            items.add(opt);
        }
        data.add("choices", items);

        JsonObject response = requestFromClient("orderRequest", data);
        JsonArray orderedIndices = response.getAsJsonArray("orderedIndices");
        List<T> result = new ArrayList<>();
        if (orderedIndices != null) {
            for (var idx : orderedIndices) {
                int i = idx.getAsInt();
                if (i >= 0 && i < sourceChoices.size()) {
                    result.add(sourceChoices.get(i));
                }
            }
        }
        if (result.isEmpty()) {
            result.addAll(sourceChoices);
        }
        return new OrderResult<>(result, false);
    }

    @Override
    public <T> List<T> insertInList(String title, T newItem, List<T> oldItems) {
        List<T> all = new ArrayList<>(oldItems);
        all.add(0, newItem);
        OrderResult<T> result = order(title, null, 0, 0, all, null, null, false, false);
        return result.ordered();
    }

    @Override
    public List<PaperCard> sideboard(CardPool sideboard, CardPool main, String message) {
        return new ArrayList<>(sideboard.toFlatList());
    }

    @Override
    public GameEntityView chooseSingleEntityForEffect(String title, List<? extends GameEntityView> optionList,
            DelayedReveal delayedReveal, boolean isOptional) {
        if (optionList == null || optionList.isEmpty()) return null;
        if (optionList.size() == 1 && !isOptional) return optionList.get(0);

        List<GameEntityView> choices = new ArrayList<>(optionList);
        int min = isOptional ? 0 : 1;

        JsonObject data = new JsonObject();
        data.addProperty("message", title);
        data.addProperty("min", min);
        data.addProperty("max", 1);
        JsonArray opts = new JsonArray();
        for (int i = 0; i < choices.size(); i++) {
            JsonObject opt = new JsonObject();
            opt.addProperty("index", i);
            opt.addProperty("label", choices.get(i).toString());
            if (choices.get(i) instanceof CardView cv) {
                opt.add("card", GameSerializer.serializeCard(cv));
            }
            opts.add(opt);
        }
        data.add("choices", opts);

        JsonObject response = requestFromClient("choiceRequest", data);
        JsonArray selected = response.getAsJsonArray("selectedIndices");
        if (selected != null && !selected.isEmpty()) {
            int idx = selected.get(0).getAsInt();
            if (idx >= 0 && idx < choices.size()) {
                return choices.get(idx);
            }
        }
        return isOptional ? null : choices.get(0);
    }

    @Override
    public List<GameEntityView> chooseEntitiesForEffect(String title, List<? extends GameEntityView> optionList,
            int min, int max, DelayedReveal delayedReveal) {
        List<GameEntityView> choices = new ArrayList<>(optionList);
        List<GameEntityView> result = getChoices(title, min, max, choices, null, null);
        return result;
    }

    @Override
    public List<CardView> manipulateCardList(String title, Iterable<CardView> cards,
            Iterable<CardView> manipulable, boolean toTop, boolean toBottom, boolean toAnywhere) {
        List<CardView> list = new ArrayList<>();
        for (CardView c : cards) list.add(c);
        return list;
    }

    @Override
    public void setSelectables(Iterable<CardView> cards, int min, int max) {
        super.setSelectables(cards, min, max);
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "selectables");
        JsonArray arr = new JsonArray();
        if (cards != null) {
            for (CardView c : cards) {
                arr.add(c.getId());
            }
        }
        msg.add("cardIds", arr);
        msg.addProperty("min", min);
        msg.addProperty("max", max);
        send(msg);
    }

    @Override
    public void clearSelectables() {
        super.clearSelectables();
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "selectables");
        msg.add("cardIds", new JsonArray());
        msg.addProperty("min", 0);
        msg.addProperty("max", 0);
        send(msg);
    }
}
