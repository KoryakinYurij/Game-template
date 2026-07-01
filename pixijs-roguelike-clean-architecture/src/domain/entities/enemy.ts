import { EnemyKind, Position, Stats } from '../types';

export interface EnemyEntity {
  id: string;
  kind: EnemyKind;
  name: string;
  icon: string;
  isBoss: boolean;
  stats: Stats;
  position: Position;
  xpReward: number;
  goldReward: number;
  aggroRadius: number;
  color: number;
}
