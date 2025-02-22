export interface GameStats {
  health: number;
  maxHealth: number;
  gold: number;
  inventory: string[];
}

export interface GameDecision {
  timestamp: string;
  type: 'MORAL' | 'COMBAT' | 'ALLIANCE' | 'QUEST' | 'ITEM';
  description: string;
  consequences: string[];
  affectedNPCs: string[];
  flags: {
    isBetrayal: boolean;
    isKilling: boolean;
    isHeroic: boolean;
    isPermanent: boolean;
  };
}

export interface WorldState {
  alliances: Record<string, 'friendly' | 'hostile' | 'neutral'>;
  deadNPCs: string[];
  unlockedLocations: string[];
  activeQuests: string[];
  completedQuests: string[];
  reputation: Record<string, number>;
}

export interface GamePhase {
  currentPhase: 'DISASTER' | 'SURVIVAL' | 'CHALLENGE' | 'VICTORY';
  daysSurvived: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface GameSystemLog {
  decisions: GameDecision[];
  worldState: WorldState;
  gameState: GamePhase;
  messageHistory: Array<{
    role: string;
    content: string;
  }>;
}

export interface GameChanges {
  healthChange: number | null;
  goldChange: number | null;
  itemsAdded: string[] | null;
  itemsRemoved: string[] | null;
}

export interface GameChoice {
  id: number;
  text: string;
  preview: string;
}

export interface GameResponse {
  stats: GameStats;
  narrative: string;
  storySoFar: string;
  systemLog: GameSystemLog;
  changes: GameChanges;
  choices: GameChoice[];
} 