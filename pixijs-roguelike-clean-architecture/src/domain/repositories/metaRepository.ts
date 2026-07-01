import { ClassType } from '../types';

export interface MetaProgressState {
  essence: number;
  upgrades: Record<string, number>;
  unlockedClasses: ClassType[];
  totalRuns: number;
  bestFloor: number;
  totalKills: number;
}

export function createDefaultMetaState(): MetaProgressState {
  return {
    essence: 0,
    upgrades: {},
    unlockedClasses: [ClassType.WARRIOR],
    totalRuns: 0,
    bestFloor: 0,
    totalKills: 0,
  };
}

export interface IMetaRepository {
  load(): MetaProgressState;
  save(state: MetaProgressState): void;
  reset(): void;
}
