import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  GameState,
  ButtonState,
  ChoiceRequest,
  ConfirmRequest,
  OptionRequest,
  InputRequest,
  DamageAssignRequest,
  ServerMessage,
} from '../types';

export interface GameSocketState {
  connected: boolean;
  gameState: GameState | null;
  prompt: string;
  buttons: ButtonState;
  selectableCardIds: Set<number>;
  myPlayerIds: Set<number>;
  availableDecks: string[];
  activeDialog: ActiveDialog | null;
}

export type ActiveDialog =
  | { kind: 'choice'; data: ChoiceRequest }
  | { kind: 'confirm'; data: ConfirmRequest }
  | { kind: 'option'; data: OptionRequest }
  | { kind: 'input'; data: InputRequest }
  | { kind: 'damage'; data: DamageAssignRequest }
  | { kind: 'order'; data: ChoiceRequest }
  | { kind: 'reveal'; message: string; items: any[] }
  | { kind: 'message'; message: string; title: string };

const DEFAULT_BUTTONS: ButtonState = {
  label1: 'OK', label2: 'Cancel',
  enable1: false, enable2: false, focus1: true,
};

export function useGameSocket(url: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<GameSocketState>({
    connected: false,
    gameState: null,
    prompt: '',
    buttons: DEFAULT_BUTTONS,
    selectableCardIds: new Set(),
    myPlayerIds: new Set(),
    availableDecks: [],
    activeDialog: null,
  });

  const send = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setState(s => ({ ...s, connected: true }));
    };

    ws.onclose = () => {
      setState(s => ({ ...s, connected: false }));
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        handleMessage(msg);
      } catch (e) {
        console.error('Failed to parse message:', e);
      }
    };

    function handleMessage(msg: ServerMessage) {
      switch (msg.type) {
        case 'welcome':
          setState(s => ({ ...s, availableDecks: msg.availableDecks || [] }));
          break;
        case 'gameStarted':
          setState(s => ({ ...s, myPlayerIds: new Set(msg.myPlayerIds) }));
          break;
        case 'gameState':
          setState(s => ({ ...s, gameState: msg.data }));
          break;
        case 'prompt':
          setState(s => ({ ...s, prompt: msg.message }));
          break;
        case 'buttons':
          setState(s => ({
            ...s,
            buttons: {
              label1: msg.label1, label2: msg.label2,
              enable1: msg.enable1, enable2: msg.enable2,
              focus1: msg.focus1,
            },
          }));
          break;
        case 'selectables':
          setState(s => ({ ...s, selectableCardIds: new Set(msg.cardIds) }));
          break;
        case 'choiceRequest':
          setState(s => ({ ...s, activeDialog: { kind: 'choice', data: msg } }));
          break;
        case 'confirmRequest':
          setState(s => ({ ...s, activeDialog: { kind: 'confirm', data: msg } }));
          break;
        case 'optionRequest':
          setState(s => ({ ...s, activeDialog: { kind: 'option', data: msg } }));
          break;
        case 'inputRequest':
          setState(s => ({ ...s, activeDialog: { kind: 'input', data: msg } }));
          break;
        case 'assignDamageRequest':
          setState(s => ({ ...s, activeDialog: { kind: 'damage', data: msg } }));
          break;
        case 'orderRequest':
          setState(s => ({ ...s, activeDialog: { kind: 'order', data: { ...msg, min: msg.min ?? 0, max: msg.max ?? msg.choices.length } } }));
          break;
        case 'reveal':
          setState(s => ({ ...s, activeDialog: { kind: 'reveal', message: msg.message, items: msg.items } }));
          break;
        case 'message':
          setState(s => ({ ...s, activeDialog: { kind: 'message', message: msg.message, title: msg.title } }));
          break;
        case 'gameEnded':
        case 'gameFinished':
          setState(s => ({ ...s, prompt: 'Game Over' }));
          break;
        case 'error':
          console.error('Server error:', msg.message);
          break;
      }
    }

    return () => {
      ws.close();
    };
  }, [url]);

  const actions = {
    selectCard: (cardId: number) => send({ type: 'selectCard', cardId }),
    selectPlayer: (playerId: number) => send({ type: 'selectPlayer', playerId }),
    selectButtonOk: () => send({ type: 'selectButtonOk' }),
    selectButtonCancel: () => send({ type: 'selectButtonCancel' }),
    passPriority: () => send({ type: 'passPriority' }),
    concede: () => send({ type: 'concede' }),
    alphaStrike: () => send({ type: 'alphaStrike' }),
    startGame: (deck1: string, deck2: string) => send({ type: 'startGame', deck1, deck2 }),

    respondChoice: (requestId: string, selectedIndices: number[]) => {
      send({ type: 'choiceResponse', requestId, selectedIndices });
      setState(s => ({ ...s, activeDialog: null }));
    },
    respondConfirm: (requestId: string, result: boolean) => {
      send({ type: 'confirmResponse', requestId, result });
      setState(s => ({ ...s, activeDialog: null }));
    },
    respondOption: (requestId: string, selectedIndex: number) => {
      send({ type: 'optionResponse', requestId, selectedIndex });
      setState(s => ({ ...s, activeDialog: null }));
    },
    respondInput: (requestId: string, value: string) => {
      send({ type: 'inputResponse', requestId, value });
      setState(s => ({ ...s, activeDialog: null }));
    },
    respondOrder: (requestId: string, orderedIndices: number[]) => {
      send({ type: 'orderResponse', requestId, orderedIndices });
      setState(s => ({ ...s, activeDialog: null }));
    },
    respondDamage: (requestId: string, assignments: Record<string, number>) => {
      send({ type: 'damageResponse', requestId, assignments });
      setState(s => ({ ...s, activeDialog: null }));
    },
    dismissDialog: () => {
      setState(s => ({ ...s, activeDialog: null }));
    },
  };

  return { state, actions };
}
