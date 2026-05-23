import { useState } from 'react';
import { useGameSocket } from './hooks/useGameSocket';
import GameBoard from './components/GameBoard';
import Dialog from './components/Dialog';

const WS_URL = 'ws://localhost:17171';

function DeckSelector({ decks, onStart }: { decks: string[]; onStart: (d1: string, d2: string) => void }) {
  const [deck1, setDeck1] = useState('');
  const [deck2, setDeck2] = useState('');

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      background: 'linear-gradient(135deg, #0a0a12 0%, #1a1a2e 50%, #16213e 100%)',
      color: '#e0e0e0',
    }}>
      <h1 style={{
        fontSize: 48, fontWeight: 800, margin: '0 0 8px',
        background: 'linear-gradient(90deg, #ffd700, #ffaa00)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        FORGE ARENA
      </h1>
      <p style={{ opacity: 0.5, margin: '0 0 32px' }}>Modern Playtesting</p>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 16,
        background: 'rgba(255,255,255,0.05)', padding: 32,
        borderRadius: 12, border: '1px solid #333', minWidth: 400,
      }}>
        <label style={{ fontSize: 14, fontWeight: 600 }}>Your Deck</label>
        {decks.length > 0 ? (
          <select
            value={deck1}
            onChange={e => setDeck1(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select a deck...</option>
            {decks.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input
            value={deck1}
            onChange={e => setDeck1(e.target.value)}
            placeholder="Deck name or .dck filename"
            style={inputStyle}
          />
        )}

        <label style={{ fontSize: 14, fontWeight: 600 }}>Opponent's Deck (AI)</label>
        {decks.length > 0 ? (
          <select
            value={deck2}
            onChange={e => setDeck2(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select a deck...</option>
            {decks.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        ) : (
          <input
            value={deck2}
            onChange={e => setDeck2(e.target.value)}
            placeholder="Deck name or .dck filename"
            style={inputStyle}
          />
        )}

        <button
          onClick={() => onStart(deck1, deck2)}
          disabled={!deck1 || !deck2}
          style={{
            padding: '12px 24px', borderRadius: 8, border: 'none',
            background: deck1 && deck2 ? 'linear-gradient(90deg, #ffd700, #ffaa00)' : '#444',
            color: deck1 && deck2 ? '#000' : '#888',
            fontWeight: 700, fontSize: 16, cursor: deck1 && deck2 ? 'pointer' : 'default',
            marginTop: 8,
          }}
        >
          Start Match
        </button>
      </div>
    </div>
  );
}

function ConnectingScreen() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100vh',
      background: '#0a0a12', color: '#e0e0e0',
    }}>
      <h2 style={{ color: '#ffd700' }}>Connecting to Forge Engine...</h2>
      <p style={{ opacity: 0.5 }}>
        Make sure the Java WebSocket server is running on port 17171
      </p>
      <p style={{ opacity: 0.3, fontSize: 12, marginTop: 16 }}>
        Start it with: java -jar forge-gui-web-*-jar-with-dependencies.jar
      </p>
    </div>
  );
}

export default function App() {
  const { state, actions } = useGameSocket(WS_URL);

  if (!state.connected) {
    return <ConnectingScreen />;
  }

  if (!state.gameState) {
    return (
      <DeckSelector
        decks={state.availableDecks}
        onStart={(d1, d2) => actions.startGame(d1, d2)}
      />
    );
  }

  return (
    <>
      <GameBoard
        gameState={state.gameState}
        myPlayerIds={state.myPlayerIds}
        prompt={state.prompt}
        buttons={state.buttons}
        selectableCardIds={state.selectableCardIds}
        onCardClick={actions.selectCard}
        onPlayerClick={actions.selectPlayer}
        onButtonOk={actions.selectButtonOk}
        onButtonCancel={actions.selectButtonCancel}
        onPassPriority={actions.passPriority}
        onConcede={actions.concede}
        onAlphaStrike={actions.alphaStrike}
      />
      {state.activeDialog && (
        <Dialog
          dialog={state.activeDialog}
          onChoiceResponse={actions.respondChoice}
          onConfirmResponse={actions.respondConfirm}
          onOptionResponse={actions.respondOption}
          onInputResponse={actions.respondInput}
          onOrderResponse={actions.respondOrder}
          onDamageResponse={actions.respondDamage}
          onDismiss={actions.dismissDialog}
        />
      )}
    </>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 6,
  background: '#2a2a3e', border: '1px solid #555',
  color: '#e0e0e0', fontSize: 14,
};

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 6,
  background: '#2a2a3e', border: '1px solid #555',
  color: '#e0e0e0', fontSize: 14,
};
