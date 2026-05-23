import type { GameState, ButtonState, StackItem } from '../types';
import { PHASE_NAMES } from '../types';
import PlayerArea from './PlayerArea';

interface GameBoardProps {
  gameState: GameState;
  myPlayerIds: Set<number>;
  prompt: string;
  buttons: ButtonState;
  selectableCardIds: Set<number>;
  onCardClick: (cardId: number) => void;
  onPlayerClick: (playerId: number) => void;
  onButtonOk: () => void;
  onButtonCancel: () => void;
  onPassPriority: () => void;
  onConcede: () => void;
  onAlphaStrike: () => void;
}

const PHASE_ORDER = [
  'UNTAP', 'UPKEEP', 'DRAW', 'MAIN1',
  'COMBAT_BEGIN', 'COMBAT_DECLARE_ATTACKERS', 'COMBAT_DECLARE_BLOCKERS',
  'COMBAT_FIRST_STRIKE_DAMAGE', 'COMBAT_DAMAGE', 'COMBAT_END',
  'MAIN2', 'END_OF_TURN', 'CLEANUP',
];

function PhaseBar({ currentPhase }: { currentPhase: string }) {
  return (
    <div style={{
      display: 'flex', gap: 1, padding: '4px 8px',
      background: 'rgba(0,0,0,0.3)', borderRadius: 6,
    }}>
      {PHASE_ORDER.map(phase => {
        const active = phase === currentPhase;
        const isCombat = phase.startsWith('COMBAT');
        return (
          <div
            key={phase}
            title={PHASE_NAMES[phase] || phase}
            style={{
              padding: '2px 6px', fontSize: 10, borderRadius: 3,
              background: active ? '#ffd700' : isCombat ? 'rgba(211,32,42,0.2)' : 'rgba(255,255,255,0.05)',
              color: active ? '#000' : '#888',
              fontWeight: active ? 700 : 400,
              transition: 'all 0.2s',
            }}
          >
            {(PHASE_NAMES[phase] || phase).slice(0, 5)}
          </div>
        );
      })}
    </div>
  );
}

function StackDisplay({ stack }: { stack: StackItem[] }) {
  if (stack.length === 0) return null;

  return (
    <div style={{
      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
      background: 'rgba(30,30,46,0.95)', border: '1px solid #555', borderRadius: 8,
      padding: 8, minWidth: 180, maxWidth: 250, zIndex: 10,
    }}>
      <div style={{ fontSize: 11, color: '#ffd700', marginBottom: 4, fontWeight: 700 }}>
        THE STACK ({stack.length})
      </div>
      {stack.map((item, i) => (
        <div key={i} style={{
          padding: '4px 8px', marginBottom: 2, borderRadius: 4,
          background: i === 0 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)',
          border: i === 0 ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent',
          fontSize: 11,
        }}>
          <div style={{ fontWeight: 600 }}>{item.name}</div>
          {item.activatingPlayer && (
            <div style={{ fontSize: 10, opacity: 0.6 }}>by {item.activatingPlayer}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function GameBoard({
  gameState, myPlayerIds, prompt, buttons, selectableCardIds,
  onCardClick, onPlayerClick, onButtonOk, onButtonCancel, onPassPriority, onConcede, onAlphaStrike,
}: GameBoardProps) {
  const myPlayers = gameState.players.filter(p => myPlayerIds.has(p.id));
  const opponents = gameState.players.filter(p => !myPlayerIds.has(p.id));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: '#121218', color: '#e0e0e0', position: 'relative',
    }}>
      {/* Turn/Phase header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
        padding: '6px 16px', background: 'rgba(0,0,0,0.4)',
        borderBottom: '1px solid #333',
      }}>
        <span style={{ fontSize: 13, opacity: 0.7 }}>
          Turn {gameState.turn} - {gameState.activePlayer}'s turn
        </span>
        <PhaseBar currentPhase={gameState.phase} />
      </div>

      {/* Opponents area */}
      {opponents.map(player => (
        <PlayerArea
          key={player.id}
          player={player}
          isMe={false}
          isActive={player.id === gameState.activePlayerId}
          selectableCardIds={selectableCardIds}
          onCardClick={onCardClick}
          onPlayerClick={onPlayerClick}
        />
      ))}

      {/* Center divider with stack */}
      <div style={{
        borderTop: '1px solid #333', borderBottom: '1px solid #333',
        background: 'rgba(255,215,0,0.03)', padding: '2px 0',
        position: 'relative',
      }}>
        <StackDisplay stack={gameState.stack} />
      </div>

      {/* My area */}
      {myPlayers.map(player => (
        <PlayerArea
          key={player.id}
          player={player}
          isMe={true}
          isActive={player.id === gameState.activePlayerId}
          selectableCardIds={selectableCardIds}
          onCardClick={onCardClick}
          onPlayerClick={onPlayerClick}
        />
      ))}

      {/* Action bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 16px', background: 'rgba(0,0,0,0.5)',
        borderTop: '1px solid #444',
      }}>
        <div style={{ flex: 1, fontSize: 13, color: '#ffd700' }}>
          {prompt}
        </div>

        {buttons.enable1 && (
          <button onClick={onButtonOk} style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: buttons.focus1 ? '#ffd700' : '#444',
            color: buttons.focus1 ? '#000' : '#e0e0e0',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
          }}>
            {buttons.label1}
          </button>
        )}

        {buttons.enable2 && (
          <button onClick={onButtonCancel} style={{
            padding: '8px 20px', borderRadius: 6, border: 'none',
            background: '#444', color: '#e0e0e0',
            fontWeight: 600, fontSize: 14, cursor: 'pointer',
          }}>
            {buttons.label2}
          </button>
        )}

        <button onClick={onPassPriority} style={{
          padding: '6px 12px', borderRadius: 6, border: '1px solid #555',
          background: 'transparent', color: '#aaa', fontSize: 12,
          cursor: 'pointer',
        }}>
          Pass
        </button>

        <button onClick={onAlphaStrike} style={{
          padding: '6px 12px', borderRadius: 6, border: '1px solid #555',
          background: 'transparent', color: '#d32f2f', fontSize: 12,
          cursor: 'pointer',
        }} title="Attack with all creatures">
          All-Out Attack
        </button>

        <button onClick={onConcede} style={{
          padding: '6px 12px', borderRadius: 6, border: '1px solid #555',
          background: 'transparent', color: '#888', fontSize: 11,
          cursor: 'pointer',
        }}>
          Concede
        </button>
      </div>
    </div>
  );
}
