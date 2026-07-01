import { Tile } from '../entities/dungeon';
import { Position } from '../types';

export function updateVisibility(tiles: Tile[][], center: Position, radius: number): Tile[][] {
  const height = tiles.length;
  const width = tiles[0]?.length ?? 0;
  const result: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      const dist = Math.max(Math.abs(x - center.x), Math.abs(y - center.y));
      const visible = dist <= radius;
      const source = tiles[y][x];
      row.push({ type: source.type, explored: source.explored || visible, visible });
    }
    result.push(row);
  }
  return result;
}
