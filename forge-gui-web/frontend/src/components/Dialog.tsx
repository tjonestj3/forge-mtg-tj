import { useState } from 'react';
import type { ActiveDialog } from '../hooks/useGameSocket';
import Card from './Card';

interface DialogProps {
  dialog: ActiveDialog;
  onChoiceResponse: (requestId: string, selectedIndices: number[]) => void;
  onConfirmResponse: (requestId: string, result: boolean) => void;
  onOptionResponse: (requestId: string, selectedIndex: number) => void;
  onInputResponse: (requestId: string, value: string) => void;
  onOrderResponse: (requestId: string, orderedIndices: number[]) => void;
  onDamageResponse: (requestId: string, assignments: Record<string, number>) => void;
  onDismiss: () => void;
}

export default function Dialog({
  dialog, onChoiceResponse, onConfirmResponse, onOptionResponse,
  onInputResponse, onOrderResponse, onDamageResponse, onDismiss,
}: DialogProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1e1e2e', border: '1px solid #444', borderRadius: 10,
        padding: 20, minWidth: 350, maxWidth: 600, maxHeight: '80vh',
        overflow: 'auto', color: '#e0e0e0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}>
        {dialog.kind === 'choice' && (
          <ChoiceDialog data={dialog.data} onRespond={onChoiceResponse} />
        )}
        {dialog.kind === 'confirm' && (
          <ConfirmDialog data={dialog.data} onRespond={onConfirmResponse} />
        )}
        {dialog.kind === 'option' && (
          <OptionDialog data={dialog.data} onRespond={onOptionResponse} />
        )}
        {dialog.kind === 'input' && (
          <InputDialog data={dialog.data} onRespond={onInputResponse} />
        )}
        {dialog.kind === 'order' && (
          <OrderDialog data={dialog.data} onRespond={onOrderResponse} />
        )}
        {dialog.kind === 'damage' && (
          <DamageDialog data={dialog.data} onRespond={onDamageResponse} />
        )}
        {dialog.kind === 'reveal' && (
          <RevealDialog message={dialog.message} items={dialog.items} onDismiss={onDismiss} />
        )}
        {dialog.kind === 'message' && (
          <MessageDialog message={dialog.message} title={dialog.title} onDismiss={onDismiss} />
        )}
      </div>
    </div>
  );
}

function ChoiceDialog({ data, onRespond }: { data: any; onRespond: (id: string, sel: number[]) => void }) {
  const [selected, setSelected] = useState<Set<number>>(new Set(data.preselected || []));
  const isMulti = data.max > 1;

  const toggle = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        if (!isMulti) next.clear();
        if (next.size < data.max) next.add(idx);
      }
      return next;
    });
  };

  const canConfirm = selected.size >= data.min && selected.size <= data.max;

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', color: '#ffd700' }}>{data.message}</h3>
      <p style={{ fontSize: 12, opacity: 0.6, margin: '0 0 8px' }}>
        Select {data.min === data.max ? data.min : `${data.min}-${data.max}`}
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 400, overflow: 'auto' }}>
        {data.choices.map((opt: any) => (
          <div
            key={opt.index}
            onClick={() => toggle(opt.index)}
            style={{
              padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
              background: selected.has(opt.index) ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
              border: selected.has(opt.index) ? '1px solid #ffd700' : '1px solid transparent',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {opt.card && <Card card={opt.card} size="small" />}
            <span>{opt.label}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        {data.min === 0 && (
          <button onClick={() => onRespond(data.requestId, [])} style={btnStyle('#555')}>
            Cancel
          </button>
        )}
        <button
          onClick={() => onRespond(data.requestId, Array.from(selected))}
          disabled={!canConfirm}
          style={btnStyle(canConfirm ? '#ffd700' : '#555', canConfirm ? '#000' : '#888')}
        >
          Confirm ({selected.size})
        </button>
      </div>
    </div>
  );
}

function ConfirmDialog({ data, onRespond }: { data: any; onRespond: (id: string, result: boolean) => void }) {
  return (
    <div>
      {data.title && <h3 style={{ margin: '0 0 8px', color: '#ffd700' }}>{data.title}</h3>}
      <p style={{ margin: '0 0 16px', whiteSpace: 'pre-wrap' }}>{data.message}</p>
      {data.card && <div style={{ marginBottom: 12 }}><Card card={data.card} size="normal" /></div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={() => onRespond(data.requestId, false)} style={btnStyle('#555')}>
          {data.noLabel || 'No'}
        </button>
        <button onClick={() => onRespond(data.requestId, true)} style={btnStyle('#ffd700', '#000')}>
          {data.yesLabel || 'Yes'}
        </button>
      </div>
    </div>
  );
}

function OptionDialog({ data, onRespond }: { data: any; onRespond: (id: string, idx: number) => void }) {
  return (
    <div>
      {data.title && <h3 style={{ margin: '0 0 8px', color: '#ffd700' }}>{data.title}</h3>}
      <p style={{ margin: '0 0 12px' }}>{data.message}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {data.options.map((opt: string, i: number) => (
          <button key={i} onClick={() => onRespond(data.requestId, i)} style={btnStyle('#333')}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function InputDialog({ data, onRespond }: { data: any; onRespond: (id: string, value: string) => void }) {
  const [value, setValue] = useState(data.initialInput || (data.min != null ? String(data.min) : ''));

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', color: '#ffd700' }}>{data.message}</h3>
      <input
        type={data.isNumeric ? 'number' : 'text'}
        value={value}
        onChange={e => setValue(e.target.value)}
        min={data.min}
        max={data.max}
        style={{
          width: '100%', padding: '8px 12px', borderRadius: 6,
          background: '#2a2a3e', border: '1px solid #555', color: '#e0e0e0',
          fontSize: 16, boxSizing: 'border-box',
        }}
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') onRespond(data.requestId, value); }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button onClick={() => onRespond(data.requestId, value)} style={btnStyle('#ffd700', '#000')}>
          Confirm
        </button>
      </div>
    </div>
  );
}

function OrderDialog({ data, onRespond }: { data: any; onRespond: (id: string, indices: number[]) => void }) {
  const [items, setItems] = useState<any[]>(data.choices || []);

  const moveUp = (i: number) => {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    setItems(next);
  };

  const moveDown = (i: number) => {
    if (i >= items.length - 1) return;
    const next = [...items];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    setItems(next);
  };

  return (
    <div>
      <h3 style={{ margin: '0 0 12px', color: '#ffd700' }}>{data.message}</h3>
      <p style={{ fontSize: 12, opacity: 0.6, margin: '0 0 8px' }}>
        Drag or use arrows to reorder (top = first)
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item: any, i: number) => (
          <div key={item.index} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6,
          }}>
            <span style={{ opacity: 0.4, width: 20 }}>{i + 1}.</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            <button onClick={() => moveUp(i)} style={{ ...arrowBtn, opacity: i === 0 ? 0.3 : 1 }}>
              ^
            </button>
            <button onClick={() => moveDown(i)} style={{ ...arrowBtn, opacity: i >= items.length - 1 ? 0.3 : 1 }}>
              v
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        <button
          onClick={() => onRespond(data.requestId, items.map((it: any) => it.index))}
          style={btnStyle('#ffd700', '#000')}
        >
          Confirm Order
        </button>
      </div>
    </div>
  );
}

function DamageDialog({ data, onRespond }: { data: any; onRespond: (id: string, assignments: Record<string, number>) => void }) {
  const [assignments, setAssignments] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    data.blockers.forEach((b: any) => { init[String(b.id)] = 0; });
    return init;
  });

  const assigned = Object.values(assignments).reduce((a, b) => a + b, 0);
  const remaining = data.totalDamage - assigned;

  const addDamage = (blockerId: string) => {
    if (remaining <= 0) return;
    setAssignments(prev => ({ ...prev, [blockerId]: (prev[blockerId] || 0) + 1 }));
  };

  const removeDamage = (blockerId: string) => {
    setAssignments(prev => ({ ...prev, [blockerId]: Math.max(0, (prev[blockerId] || 0) - 1) }));
  };

  return (
    <div>
      <h3 style={{ margin: '0 0 8px', color: '#ffd700' }}>Assign Combat Damage</h3>
      <p style={{ margin: '0 0 4px' }}>
        {data.attacker.name} ({data.totalDamage} damage) - {remaining} remaining
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {data.blockers.map((blocker: any) => (
          <div key={blocker.id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: 6,
          }}>
            <span style={{ flex: 1 }}>{blocker.name} ({blocker.toughness})</span>
            <button onClick={() => removeDamage(String(blocker.id))} style={arrowBtn}>-</button>
            <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>
              {assignments[String(blocker.id)] || 0}
            </span>
            <button onClick={() => addDamage(String(blocker.id))} style={arrowBtn}>+</button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
        {data.maySkip && (
          <button onClick={() => onRespond(data.requestId, {})} style={btnStyle('#555')}>Skip</button>
        )}
        <button
          onClick={() => onRespond(data.requestId, assignments)}
          disabled={remaining > 0}
          style={btnStyle(remaining === 0 ? '#ffd700' : '#555', remaining === 0 ? '#000' : '#888')}
        >
          Assign ({assigned}/{data.totalDamage})
        </button>
      </div>
    </div>
  );
}

function RevealDialog({ message, items, onDismiss }: { message: string; items: any[]; onDismiss: () => void }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 12px', color: '#ffd700' }}>{message}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map((item: any, i: number) => (
          item.name || item.card
            ? <Card key={i} card={item.card || item} size="small" />
            : <span key={i} style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: 4 }}>
                {item.label || String(item)}
              </span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onDismiss} style={btnStyle('#ffd700', '#000')}>OK</button>
      </div>
    </div>
  );
}

function MessageDialog({ message, title, onDismiss }: { message: string; title: string; onDismiss: () => void }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 8px', color: '#ffd700' }}>{title}</h3>
      <p style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onDismiss} style={btnStyle('#ffd700', '#000')}>OK</button>
      </div>
    </div>
  );
}

function btnStyle(bg: string, color = '#e0e0e0'): React.CSSProperties {
  return {
    padding: '8px 16px', borderRadius: 6, border: 'none',
    background: bg, color, fontWeight: 600, fontSize: 14,
    cursor: 'pointer',
  };
}

const arrowBtn: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 4, border: 'none',
  background: '#333', color: '#e0e0e0', cursor: 'pointer',
  fontSize: 16, fontWeight: 700,
};
