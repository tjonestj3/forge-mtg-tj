import type { PlayerData, ManaPool } from '../types';
import { MANA_COLORS } from '../types';
import Card from './Card';

interface PlayerAreaProps {
  player: PlayerData;
  isMe: boolean;
  isActive: boolean;
  selectableCardIds: Set<number>;
  onCardClick: (cardId: number) => void;
  onPlayerClick: (playerId: number) => void;
}

function ManaDisplay({ mana }: { mana: ManaPool }) {
  const total = MANA_COLORS.reduce((sum, c) => sum + (mana[c.key] || 0), 0);
  if (total === 0) return null;

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {MANA_COLORS.map(c => {
        const val = mana[c.key] || 0;
        if (val === 0) return null;
        return (
          <span key={c.key} style={{
            background: c.css, color: c.key === 'B' ? '#d4c8b8' : c.key === 'W' ? '#333' : '#fff',
            borderRadius: '50%', width: 22, height: 22, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.3)',
          }}>
            {val}
          </span>
        );
      })}
    </div>
  );
}

export default function PlayerArea({ player, isMe, isActive, selectableCardIds, onCardClick, onPlayerClick }: PlayerAreaProps) {
  const lands = player.battlefield.filter(c => c.type?.toLowerCase().includes('land'));
  const nonLands = player.battlefield.filter(c => !c.type?.toLowerCase().includes('land'));

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      padding: 8, flex: 1, minHeight: 0,
    }}>
      {/* Player info bar */}
      <div
        onClick={() => onPlayerClick(player.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '6px 12px', borderRadius: 6,
          background: isActive ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)',
          border: isActive ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.1)',
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700 }}>{player.name}</span>
        <span style={{
          fontSize: 24, fontWeight: 700,
          color: player.life <= 5 ? '#ef5350' : player.life <= 10 ? '#ffa726' : '#66bb6a',
        }}>
          {player.life}
        </span>
        {player.poisonCounters > 0 && (
          <span style={{ color: '#ab47bc', fontWeight: 700 }}>
            {player.poisonCounters} poison
          </span>
        )}
        <ManaDisplay mana={player.mana} />
        <span style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 12 }}>
          Library: {player.librarySize} | Hand: {player.handSize} | GY: {player.graveyard.length}
        </span>
      </div>

      {/* Battlefield: non-lands */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'flex-start',
        minHeight: 60, padding: 4,
        background: 'rgba(255,255,255,0.02)', borderRadius: 4,
      }}>
        {nonLands.length === 0 && (
          <span style={{ opacity: 0.2, fontSize: 12, padding: 4 }}>No permanents</span>
        )}
        {nonLands.map(card => (
          <Card
            key={card.id}
            card={card}
            selectable={selectableCardIds.has(card.id)}
            onClick={() => onCardClick(card.id)}
            size="small"
          />
        ))}
      </div>

      {/* Battlefield: lands */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start',
        minHeight: 40, padding: 4,
        background: 'rgba(255,255,255,0.02)', borderRadius: 4,
      }}>
        {lands.map(card => (
          <Card
            key={card.id}
            card={card}
            selectable={selectableCardIds.has(card.id)}
            onClick={() => onCardClick(card.id)}
            size="small"
          />
        ))}
      </div>

      {/* Hand - only show for human player */}
      {isMe && player.hand.length > 0 && (
        <div style={{
          display: 'flex', gap: 4, overflowX: 'auto', padding: '4px 0',
          alignItems: 'flex-end',
        }}>
          {player.hand.map(card => (
            <Card
              key={card.id}
              card={card}
              selectable={selectableCardIds.has(card.id)}
              onClick={() => onCardClick(card.id)}
              size="normal"
            />
          ))}
        </div>
      )}
    </div>
  );
}
