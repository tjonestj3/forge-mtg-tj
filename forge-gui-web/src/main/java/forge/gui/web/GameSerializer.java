package forge.gui.web;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import forge.game.GameEntityView;
import forge.game.GameView;
import forge.game.card.CardView;
import forge.game.card.CounterEnumType;
import forge.game.card.CounterType;
import forge.game.player.PlayerView;
import forge.game.spellability.SpellAbilityView;
import forge.trackable.TrackableCollection;

import java.util.List;
import java.util.Map;

public final class GameSerializer {
    private GameSerializer() {}

    public static JsonObject serializeGameState(GameView game) {
        JsonObject obj = new JsonObject();
        if (game == null) return obj;

        obj.addProperty("turn", game.getTurn());
        obj.addProperty("phase", game.getPhase() != null ? game.getPhase().name() : "UNKNOWN");
        obj.addProperty("gameOver", game.isGameOver());

        PlayerView active = game.getPlayerTurn();
        if (active != null) {
            obj.addProperty("activePlayer", active.getName());
            obj.addProperty("activePlayerId", active.getId());
        }

        JsonArray players = new JsonArray();
        if (game.getPlayers() != null) {
            for (PlayerView p : game.getPlayers()) {
                players.add(serializePlayer(p));
            }
        }
        obj.add("players", players);

        JsonArray stack = new JsonArray();
        if (game.getStack() != null) {
            for (var item : game.getStack()) {
                JsonObject si = new JsonObject();
                si.addProperty("name", item.getText());
                si.addProperty("text", item.getText());
                si.addProperty("sourceCardId", item.getSourceCard() != null ? item.getSourceCard().getId() : -1);
                if (item.getActivatingPlayer() != null) {
                    si.addProperty("activatingPlayer", item.getActivatingPlayer().getName());
                }
                stack.add(si);
            }
        }
        obj.add("stack", stack);

        if (game.getCombat() != null) {
            obj.add("combat", serializeCombat(game));
        }

        return obj;
    }

    public static JsonObject serializePlayer(PlayerView player) {
        JsonObject obj = new JsonObject();
        obj.addProperty("id", player.getId());
        obj.addProperty("name", player.getName());
        obj.addProperty("life", player.getLife());
        obj.addProperty("poisonCounters", player.getCounters(CounterEnumType.POISON));
        obj.addProperty("energyCounters", player.getCounters(CounterEnumType.ENERGY));
        obj.addProperty("isAI", player.isAI());

        obj.add("hand", serializeCardIterable(player.getHand()));
        obj.addProperty("handSize", player.getHand() != null ? player.getHand().size() : 0);
        obj.add("battlefield", serializeCardIterable(player.getBattlefield()));
        obj.add("graveyard", serializeCardIterable(player.getGraveyard()));
        obj.add("exile", serializeCardIterable(player.getExile()));
        obj.addProperty("librarySize", player.getLibrary() != null ? player.getLibrary().size() : 0);

        JsonObject mana = new JsonObject();
        mana.addProperty("W", player.getMana((byte) 0));
        mana.addProperty("U", player.getMana((byte) 1));
        mana.addProperty("B", player.getMana((byte) 2));
        mana.addProperty("R", player.getMana((byte) 3));
        mana.addProperty("G", player.getMana((byte) 4));
        mana.addProperty("C", player.getMana((byte) 6));
        obj.add("mana", mana);

        return obj;
    }

    public static JsonObject serializeCard(CardView card) {
        JsonObject obj = new JsonObject();
        if (card == null) return obj;

        CardView.CardStateView state = card.getCurrentState();
        obj.addProperty("id", card.getId());
        obj.addProperty("name", state.getName());
        obj.addProperty("manaCost", state.getManaCost() != null ? state.getManaCost().toString() : "");
        obj.addProperty("oracleText", state.getOracleText());
        obj.addProperty("type", state.getType().toString());
        obj.addProperty("power", state.getPower());
        obj.addProperty("toughness", state.getToughness());
        obj.addProperty("loyalty", state.getLoyalty());
        obj.addProperty("tapped", card.isTapped());
        obj.addProperty("faceDown", card.isFaceDown());
        obj.addProperty("attacking", card.isAttacking());
        obj.addProperty("blocking", card.isBlocking());
        obj.addProperty("sickness", card.hasSickness());
        obj.addProperty("damage", card.getDamage());
        obj.addProperty("zone", card.getZone() != null ? card.getZone().name() : "Unknown");

        if (state.getColors() != null) {
            obj.addProperty("colors", state.getColors().toEnumSet().toString());
        }

        if (card.getCounters() != null && !card.getCounters().isEmpty()) {
            JsonObject counters = new JsonObject();
            for (Map.Entry<CounterType, Integer> e : card.getCounters().entrySet()) {
                counters.addProperty(e.getKey().getName(), e.getValue());
            }
            obj.add("counters", counters);
        }

        JsonArray colors = new JsonArray();
        if (state.getColors() != null) {
            for (var c : state.getColors()) {
                colors.add(c.toString());
            }
        }
        obj.add("colorList", colors);

        obj.addProperty("imageKey", card.getCurrentState().getImageKey());

        return obj;
    }

    public static JsonArray serializeCardList(TrackableCollection<CardView> cards) {
        JsonArray arr = new JsonArray();
        if (cards == null) return arr;
        for (CardView c : cards) {
            arr.add(serializeCard(c));
        }
        return arr;
    }

    public static JsonArray serializeCardIterable(Iterable<CardView> cards) {
        JsonArray arr = new JsonArray();
        if (cards == null) return arr;
        for (CardView c : cards) {
            arr.add(serializeCard(c));
        }
        return arr;
    }

    public static JsonArray serializeCardList(Iterable<CardView> cards) {
        JsonArray arr = new JsonArray();
        if (cards == null) return arr;
        for (CardView c : cards) {
            arr.add(serializeCard(c));
        }
        return arr;
    }

    public static JsonObject serializeCombat(GameView game) {
        JsonObject combat = new JsonObject();
        var combatView = game.getCombat();
        if (combatView == null) return combat;

        JsonArray attackers = new JsonArray();
        if (combatView.getAttackers() != null) {
            for (CardView attacker : combatView.getAttackers()) {
                JsonObject a = new JsonObject();
                a.add("card", serializeCard(attacker));

                JsonArray blockers = new JsonArray();
                var blockerList = combatView.getBlockers(attacker);
                if (blockerList != null) {
                    for (CardView blocker : blockerList) {
                        blockers.add(serializeCard(blocker));
                    }
                }
                a.add("blockers", blockers);

                GameEntityView defender = combatView.getDefender(attacker);
                if (defender != null) {
                    a.addProperty("defenderId", defender.getId());
                    a.addProperty("defenderName", defender.toString());
                }

                attackers.add(a);
            }
        }
        combat.add("attackers", attackers);
        return combat;
    }

    public static <T> JsonArray serializeChoices(List<T> choices) {
        JsonArray arr = new JsonArray();
        for (int i = 0; i < choices.size(); i++) {
            JsonObject opt = new JsonObject();
            opt.addProperty("index", i);
            T item = choices.get(i);
            opt.addProperty("label", item.toString());
            opt.addProperty("type", item.getClass().getSimpleName());
            if (item instanceof CardView cv) {
                opt.add("card", serializeCard(cv));
            } else if (item instanceof SpellAbilityView sav) {
                opt.addProperty("label", sav.toString());
            } else if (item instanceof GameEntityView gev) {
                opt.addProperty("entityId", gev.getId());
            }
            arr.add(opt);
        }
        return arr;
    }
}
