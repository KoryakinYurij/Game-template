import { Position, TileType } from '../types';
import { EnemyEntity } from './enemy';
import { Item } from './item';

export interface Tile {
  type: TileType;
  explored: boolean;
  visible: boolean;
}

export type GroundItem =
  | { id: string; position: Position; kind: 'gold'; amount: number }
  | { id: string; position: Position; kind: 'potion' }
  | { id: string; position: Position; kind: 'item'; item: Item };

export interface DungeonFloor {
  level: number;
  width: number;
  height: number;
  tiles: Tile[][]; // indexed [y][x]
  enemies: EnemyEntity[];
  groundItems: GroundItem[];
  stairsPosition: Position;
  playerStart: Position;
}
