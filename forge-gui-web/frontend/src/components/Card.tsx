import type { CardData } from '../types';

interface CardProps {
  card: CardData;
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
  size?: 'small' | 'normal' | 'large';
  faceUp?: boolean;
}

function cardColor(card: CardData): string {
  const colors = card.colorList || [];
  if (colors.length === 0) return '#94908d';
  if (colors.length > 1) return '#c9b458';
  switch (colors[0]) {
    case 'White': return '#f9faf4';
    case 'Blue': return '#0e68ab';
    case 'Black': return '#2b2520';
    case 'Red': return '#d3202a';
    case 'Green': return '#00733e';
    default: return '#94908d';
  }
}

function cardTextColor(card: CardData): string {
  const colors = card.colorList || [];
  if (colors.length === 0) return '#1a1a1a';
  if (colors.length > 1) return '#1a1a1a';
  switch (colors[0]) {
    case 'White': return '#1a1a1a';
    case 'Blue': return '#ffffff';
    case 'Black': return '#d4c8b8';
    case 'Red': return '#ffffff';
    case 'Green': return '#ffffff';
    default: return '#1a1a1a';
  }
}

const SIZES = {
  small: { width: 80, height: 112, fontSize: 9, ptSize: 11 },
  normal: { width: 120, height: 168, fontSize: 11, ptSize: 14 },
  large: { width: 180, height: 252, fontSize: 13, ptSize: 16 },
};

export default function Card({ card, selectable, selected, onClick, size = 'normal', faceUp = true }: CardProps) {
  const dim = SIZES[size];
  const bg = cardColor(card);
  const fg = cardTextColor(card);
  const isCreature = card.type?.toLowerCase().includes('creature');
  const isPW = card.type?.toLowerCase().includes('planeswalker');
  const showFace = faceUp && !card.faceDown;

  return (
    <div
      onClick={onClick}
      style={{
        width: dim.width,
        height: dim.height,
        borderRadius: 6,
        border: selected ? '3px solid #ffd700' : selectable ? '2px solid #4fc3f7' : '1px solid #555',
        background: showFace ? bg : '#3d2b1f',
        color: showFace ? fg : '#c9a96e',
        cursor: selectable ? 'pointer' : 'default',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontSize: dim.fontSize,
        position: 'relative',
        transform: card.tapped ? 'rotate(90deg)' : undefined,
        transformOrigin: 'center center',
        margin: card.tapped ? '15px 20px' : '2px',
        boxShadow: selected
          ? '0 0 12px rgba(255,215,0,0.6)'
          : selectable
            ? '0 0 8px rgba(79,195,247,0.4)'
            : '0 2px 4px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {!showFace ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontStyle: 'italic', fontSize: dim.fontSize + 2,
        }}>
          MTG
        </div>
      ) : (
        <>
          <div style={{
            padding: '3px 4px', display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', borderBottom: '1px solid rgba(0,0,0,0.2)',
            background: 'rgba(0,0,0,0.1)',
          }}>
            <span style={{ fontWeight: 700, flex: 1, lineHeight: 1.1, wordBreak: 'break-word' }}>
              {card.name}
            </span>
            <span style={{ fontFamily: 'monospace', fontSize: dim.fontSize - 1, opacity: 0.8, marginLeft: 2, whiteSpace: 'nowrap' }}>
              {card.manaCost?.replace(/[{}]/g, '')}
            </span>
          </div>

          <div style={{
            padding: '2px 4px', fontSize: dim.fontSize - 1,
            borderBottom: '1px solid rgba(0,0,0,0.15)',
            opacity: 0.85, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
          }}>
            {card.type}
          </div>

          <div style={{
            flex: 1, padding: '2px 4px', fontSize: dim.fontSize - 2,
            overflow: 'hidden', opacity: 0.75, lineHeight: 1.2,
          }}>
            {card.oracleText?.slice(0, 200)}
          </div>

          {(isCreature || isPW) && (
            <div style={{
              alignSelf: 'flex-end', padding: '1px 6px', fontSize: dim.ptSize,
              fontWeight: 700, background: 'rgba(0,0,0,0.15)', borderRadius: '4px 0 0 0',
            }}>
              {isCreature
                ? `${card.power}/${card.toughness}`
                : card.loyalty
              }
            </div>
          )}

          {card.damage > 0 && (
            <div style={{
              position: 'absolute', top: 2, right: 2, background: '#d32f2f', color: '#fff',
              borderRadius: '50%', width: 16, height: 16, display: 'flex',
              alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
            }}>
              {card.damage}
            </div>
          )}

          {card.counters && Object.keys(card.counters).length > 0 && (
            <div style={{
              position: 'absolute', bottom: isCreature || isPW ? 22 : 2, left: 2,
              display: 'flex', gap: 2,
            }}>
              {Object.entries(card.counters).map(([name, count]) => (
                <span key={name} style={{
                  background: '#6a1b9a', color: '#fff', borderRadius: 4,
                  padding: '0 3px', fontSize: 9,
                }}>
                  {count} {name}
                </span>
              ))}
            </div>
          )}

          {card.attacking && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: 'rgba(211,32,42,0.8)', color: '#fff', padding: '2px 6px',
              borderRadius: 4, fontSize: 10, fontWeight: 700,
            }}>
              ATK
            </div>
          )}
          {card.blocking && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: 'rgba(14,104,171,0.8)', color: '#fff', padding: '2px 6px',
              borderRadius: 4, fontSize: 10, fontWeight: 700,
            }}>
              BLK
            </div>
          )}
        </>
      )}
    </div>
  );
}
