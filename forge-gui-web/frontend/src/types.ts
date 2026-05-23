export interface CardData {
  id: number;
  name: string;
  manaCost: string;
  oracleText: string;
  type: string;
  power: string;
  toughness: string;
  loyalty: string;
  tapped: boolean;
  faceDown: boolean;
  attacking: boolean;
  blocking: boolean;
  sickness: boolean;
  damage: number;
  zone: string;
  colors: string;
  colorList: string[];
  counters?: Record<string, number>;
  imageKey?: string;
}

export interface ManaPool {
  W: number;
  U: number;
  B: number;
  R: number;
  G: number;
  C: number;
}

export interface PlayerData {
  id: number;
  name: string;
  life: number;
  poisonCounters: number;
  energyCounters: number;
  isAI: boolean;
  hand: CardData[];
  handSize: number;
  battlefield: CardData[];
  graveyard: CardData[];
  exile: CardData[];
  librarySize: number;
  mana: ManaPool;
}

export interface StackItem {
  name: string;
  text: string;
  sourceCardId: number;
  activatingPlayer?: string;
}

export interface CombatData {
  attackers: {
    card: CardData;
    blockers: CardData[];
    defenderId?: number;
    defenderName?: string;
  }[];
}

export interface GameState {
  turn: number;
  phase: string;
  activePlayer: string;
  activePlayerId: number;
  gameOver: boolean;
  players: PlayerData[];
  stack: StackItem[];
  combat?: CombatData;
}

export interface ButtonState {
  label1: string;
  label2: string;
  enable1: boolean;
  enable2: boolean;
  focus1: boolean;
}

export interface ChoiceOption {
  index: number;
  label: string;
  type?: string;
  card?: CardData;
}

export interface ChoiceRequest {
  requestId: string;
  message: string;
  min: number;
  max: number;
  choices: ChoiceOption[];
  preselected?: number[];
}

export interface ConfirmRequest {
  requestId: string;
  message: string;
  title?: string;
  yesLabel?: string;
  noLabel?: string;
  card?: CardData;
}

export interface OptionRequest {
  requestId: string;
  message: string;
  title?: string;
  options: string[];
  defaultOption: number;
}

export interface InputRequest {
  requestId: string;
  message: string;
  min?: number;
  max?: number;
  isNumeric?: boolean;
  initialInput?: string;
}

export interface DamageAssignRequest {
  requestId: string;
  message: string;
  attacker: CardData;
  blockers: CardData[];
  totalDamage: number;
  maySkip: boolean;
}

export type ServerMessage =
  | { type: 'welcome'; message: string; availableDecks: string[] }
  | { type: 'gameStarted'; myPlayerIds: number[] }
  | { type: 'gameState'; data: GameState }
  | { type: 'prompt'; message: string; playerId?: number; card?: CardData }
  | { type: 'buttons'; label1: string; label2: string; enable1: boolean; enable2: boolean; focus1: boolean }
  | { type: 'selectables'; cardIds: number[]; min: number; max: number }
  | { type: 'currentPlayer'; playerId: number; playerName: string }
  | { type: 'choiceRequest'; requestId: string; message: string; min: number; max: number; choices: ChoiceOption[]; preselected?: number[] }
  | { type: 'confirmRequest'; requestId: string; message: string; title?: string; yesLabel?: string; noLabel?: string; card?: CardData; defaultYes?: boolean }
  | { type: 'optionRequest'; requestId: string; message: string; title?: string; options: string[]; defaultOption: number }
  | { type: 'inputRequest'; requestId: string; message: string; min?: number; max?: number; isNumeric?: boolean; initialInput?: string }
  | { type: 'assignDamageRequest'; requestId: string; message: string; attacker: CardData; blockers: CardData[]; totalDamage: number; maySkip: boolean }
  | { type: 'orderRequest'; requestId: string; message: string; choices: ChoiceOption[]; min?: number; max?: number }
  | { type: 'message'; message: string; title: string }
  | { type: 'error'; message: string; title?: string }
  | { type: 'reveal'; message: string; items: (CardData | { label: string })[] }
  | { type: 'gameEnded' }
  | { type: 'gameFinished' }
  | { type: 'flash' }
  | { type: 'alert' };

export const PHASE_NAMES: Record<string, string> = {
  UNTAP: 'Untap',
  UPKEEP: 'Upkeep',
  DRAW: 'Draw',
  MAIN1: 'Main 1',
  COMBAT_BEGIN: 'Begin Combat',
  COMBAT_DECLARE_ATTACKERS: 'Declare Attackers',
  COMBAT_DECLARE_BLOCKERS: 'Declare Blockers',
  COMBAT_FIRST_STRIKE_DAMAGE: 'First Strike',
  COMBAT_DAMAGE: 'Combat Damage',
  COMBAT_END: 'End Combat',
  MAIN2: 'Main 2',
  END_OF_TURN: 'End Step',
  CLEANUP: 'Cleanup',
};

export const MANA_COLORS: { key: keyof ManaPool; label: string; css: string }[] = [
  { key: 'W', label: 'W', css: '#f9faf4' },
  { key: 'U', label: 'U', css: '#0e68ab' },
  { key: 'B', label: 'B', css: '#150b00' },
  { key: 'R', label: 'R', css: '#d3202a' },
  { key: 'G', label: 'G', css: '#00733e' },
  { key: 'C', label: 'C', css: '#cbc2bf' },
];
