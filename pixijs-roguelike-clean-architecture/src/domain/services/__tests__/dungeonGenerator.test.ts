import { describe, it, expect } from 'vitest';
import { generateFloor } from '../dungeonGenerator';
import { RNG } from '../rng';

describe('dungeonGenerator', () => {
  it('generateFloor creates a valid floor', () => {
    const rng = new RNG(1);
    const floor = generateFloor(1, 0, rng);

    expect(floor.level).toBe(1);
    expect(floor.width).toBeGreaterThan(0);
    expect(floor.height).toBeGreaterThan(0);
    expect(floor.tiles.length).toBe(floor.height);
    expect(floor.tiles[0].length).toBe(floor.width);

    // Check player start position is within bounds
    expect(floor.playerStart.x).toBeGreaterThanOrEqual(0);
    expect(floor.playerStart.y).toBeGreaterThanOrEqual(0);
    expect(floor.playerStart.x).toBeLessThan(floor.width);
    expect(floor.playerStart.y).toBeLessThan(floor.height);

    // Floor 10 should have a boss
    const floor10 = generateFloor(10, 0, rng);
    const boss = floor10.enemies.find(e => e.isBoss);
    expect(boss).toBeDefined();
  });
});
