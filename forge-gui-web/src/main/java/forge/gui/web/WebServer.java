package forge.gui.web;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;

import forge.deck.Deck;
import forge.deck.io.DeckSerializer;
import forge.game.GameRules;
import forge.game.GameType;
import forge.game.player.RegisteredPlayer;
import forge.gamemodes.match.HostedMatch;
import forge.gui.GuiBase;
import forge.localinstance.properties.ForgeConstants;
import forge.model.FModel;
import forge.player.GamePlayerUtil;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;

import java.io.File;
import java.net.InetSocketAddress;
import java.util.*;

public class WebServer extends WebSocketServer {

    private final WebGuiGame guiGame = new WebGuiGame();
    private HostedMatch currentMatch;
    private String deck1Path;
    private String deck2Path;

    public WebServer(int port) {
        super(new InetSocketAddress(port));
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        System.out.println("Client connected: " + conn.getRemoteSocketAddress());
        guiGame.setConnection(conn);

        JsonObject welcome = new JsonObject();
        welcome.addProperty("type", "welcome");
        welcome.addProperty("message", "Connected to Forge Web Server");

        JsonArray deckList = new JsonArray();
        listAvailableDecks(deckList);
        welcome.add("availableDecks", deckList);
        conn.send(welcome.toString());

        if (deck1Path != null) {
            startGame(deck1Path, deck2Path);
        }
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {
        System.out.println("Client disconnected: " + reason);
        guiGame.setConnection(null);
    }

    @Override
    public void onMessage(WebSocket conn, String message) {
        try {
            var msg = com.google.gson.JsonParser.parseString(message).getAsJsonObject();
            String type = msg.get("type").getAsString();

            if ("startGame".equals(type)) {
                String d1 = msg.has("deck1") ? msg.get("deck1").getAsString() : null;
                String d2 = msg.has("deck2") ? msg.get("deck2").getAsString() : null;
                startGame(d1, d2);
            } else {
                guiGame.handleMessage(message);
            }
        } catch (Exception e) {
            System.err.println("Error handling message: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void onError(WebSocket conn, Exception ex) {
        System.err.println("WebSocket error: " + ex.getMessage());
        ex.printStackTrace();
    }

    @Override
    public void onStart() {
        System.out.println("WebSocket server started on port " + getPort());
    }

    private void startGame(String d1, String d2) {
        Deck humanDeck = loadDeck(d1);
        Deck aiDeck = loadDeck(d2);

        if (humanDeck == null) {
            sendError("Could not load player deck: " + d1);
            return;
        }
        if (aiDeck == null) {
            sendError("Could not load AI deck: " + d2);
            return;
        }

        System.out.println("Starting game: " + humanDeck.getName() + " vs " + aiDeck.getName());

        RegisteredPlayer human = new RegisteredPlayer(humanDeck);
        human.setPlayer(GamePlayerUtil.getGuiPlayer("Player", 0, 0, false));

        RegisteredPlayer ai = new RegisteredPlayer(aiDeck);
        ai.setPlayer(GamePlayerUtil.createAiPlayer("AI Opponent", "Default"));

        GameRules rules = new GameRules(GameType.Constructed);
        rules.setAppliedVariants(EnumSet.of(GameType.Constructed));
        rules.setGamesPerMatch(1);

        currentMatch = new HostedMatch();
        currentMatch.startMatch(rules, EnumSet.of(GameType.Constructed),
                Arrays.asList(human, ai), human, guiGame);
    }

    private Deck loadDeck(String deckRef) {
        if (deckRef == null || deckRef.isEmpty()) return null;

        if (deckRef.endsWith(".dck")) {
            File f = new File(deckRef);
            if (!f.isAbsolute()) {
                f = new File(ForgeConstants.DECK_CONSTRUCTED_DIR + deckRef);
            }
            if (f.exists()) {
                return DeckSerializer.fromFile(f);
            }
        }

        try {
            return FModel.getDecks().getConstructed().get(deckRef);
        } catch (Exception e) {
            System.err.println("Could not find deck by name: " + deckRef);
        }
        return null;
    }

    private void listAvailableDecks(JsonArray deckList) {
        try {
            File deckDir = new File(ForgeConstants.DECK_CONSTRUCTED_DIR);
            if (deckDir.isDirectory()) {
                File[] files = deckDir.listFiles((dir, name) -> name.endsWith(".dck"));
                if (files != null) {
                    Arrays.sort(files, Comparator.comparing(File::getName));
                    for (File f : files) {
                        String name = f.getName();
                        deckList.add(name.substring(0, name.length() - 4));
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error listing decks: " + e.getMessage());
        }

        try {
            for (Deck d : FModel.getDecks().getConstructed()) {
                deckList.add(d.getName());
            }
        } catch (Exception e) {
            // deck storage may not be initialized yet
        }
    }

    private void sendError(String message) {
        JsonObject msg = new JsonObject();
        msg.addProperty("type", "error");
        msg.addProperty("message", message);
        guiGame.setConnection(guiGame.toString().isEmpty() ? null : null);
        WebSocket conn = getConnections().stream().findFirst().orElse(null);
        if (conn != null && conn.isOpen()) {
            conn.send(msg.toString());
        }
    }

    public static void main(String[] args) {
        int port = 17171;
        String deck1 = null;
        String deck2 = null;
        String assetsDir = null;

        for (int i = 0; i < args.length; i++) {
            switch (args[i]) {
                case "--port", "-p" -> { if (i + 1 < args.length) port = Integer.parseInt(args[++i]); }
                case "--deck1", "-d1" -> { if (i + 1 < args.length) deck1 = args[++i]; }
                case "--deck2", "-d2" -> { if (i + 1 < args.length) deck2 = args[++i]; }
                case "--assets", "-a" -> { if (i + 1 < args.length) assetsDir = args[++i]; }
                case "--help", "-h" -> {
                    System.out.println("Usage: forge-gui-web [options]");
                    System.out.println("  --port, -p <port>      WebSocket port (default: 17171)");
                    System.out.println("  --deck1, -d1 <name>    Player deck name or .dck file");
                    System.out.println("  --deck2, -d2 <name>    AI deck name or .dck file");
                    System.out.println("  --assets, -a <dir>     Path to forge-gui/res directory");
                    System.out.println();
                    System.out.println("If decks aren't specified, choose them from the web UI.");
                    System.out.println("The React frontend should be started separately (npm run dev).");
                    System.exit(0);
                }
            }
        }

        if (assetsDir == null) {
            File guiRes = new File("forge-gui/res");
            if (guiRes.isDirectory()) {
                assetsDir = guiRes.getParent() + "/";
            } else {
                guiRes = new File("../forge-gui/res");
                if (guiRes.isDirectory()) {
                    assetsDir = guiRes.getParent() + "/";
                } else {
                    assetsDir = "./";
                }
            }
        }

        System.out.println("Assets directory: " + assetsDir);

        GuiBase.setInterface(new HeadlessGuiBase(assetsDir));

        System.out.println("Initializing Forge engine (loading card database)...");
        FModel.initialize(null, null);
        System.out.println("Forge engine initialized. " + FModel.getMagicDb().getCommonCards().getUniqueCards().size() + " cards loaded.");

        WebServer server = new WebServer(port);
        server.deck1Path = deck1;
        server.deck2Path = deck2;
        server.start();

        System.out.println("Forge Web Server ready on ws://localhost:" + port);
        System.out.println("Start the React frontend: cd forge-gui-web/frontend && npm install && npm run dev");
        System.out.println("Then open http://localhost:5173 in your browser.");
    }
}
