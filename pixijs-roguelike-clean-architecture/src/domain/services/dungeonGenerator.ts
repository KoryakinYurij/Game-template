import { nanoid } from 'nanoid';
import { RNG } from '../../infrastructure/random/rng';
import {
  DUNGEON_HEIGHT,
  DUNGEON_WIDTH,
  MAX_ROOMS,
  MIN_ROOMS,
  ROOM_MAX_SIZE,
  ROOM_MIN_SIZE,
} from '../config';
import { availableTemplates, getBossTemplate, scaleStatsForFloor } from '../data/enemyDefinitions';
import { generateGoldAmount, generateItem } from './lootService';
import { DungeonFloor, GroundItem, Tile } from '../entities/dungeon';
import { EnemyEntity } from '../entities/enemy';
import { Position, TileType } from '../types';

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

function roomCenter(room: Room): Position {
  return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function roomsOverlap(a: Room, b: Room, padding = 1): boolean {
  return (
    a.x - padding < b.x + b.w &&
    a.x + a.w + padding > b.x &&
    a.y - padding < b.y + b.h &&
    a.y + a.h + padding > b.y
  );
}

function createEmptyGrid(width: number, height: number): Tile[][] {
  const grid: Tile[][] = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({ type: TileType.WALL, explored: false, visible: false });
    }
    grid.push(row);
  }
  return grid;
}

function carveRoom(grid: Tile[][], room: Room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      grid[y][x].type = TileType.FLOOR;
    }
  }
}

function carveCorridor(grid: Tile[][], from: Position, to: Position, rng: RNG) {
  let { x, y } = from;
  const horizontalFirst = rng.chance(0.5);
  const carve = (cx: number, cy: number) => {
    if (grid[cy]?.[cx]) grid[cy][cx].type = TileType.FLOOR;
  };
  if (horizontalFirst) {
    while (x !== to.x) {
      carve(x, y);
      x += x < to.x ? 1 : -1;
    }
    while (y !== to.y) {
      carve(x, y);
      y += y < to.y ? 1 : -1;
    }
  } else {
    while (y !== to.y) {
      carve(x, y);
      y += y < to.y ? 1 : -1;
    }
    while (x !== to.x) {
      carve(x, y);
      x += x < to.x ? 1 : -1;
    }
  }
  carve(to.x, to.y);
}

function spawnEnemyAt(position: Position, floorLevel: number, rng: RNG, forceBoss: boolean): EnemyEntity {
  if (forceBoss) {
    const { template, name } = getBossTemplate(floorLevel);
    return {
      id: nanoid(8),
      kind: template.kind,
      name,
      icon: template.icon,
      isBoss: true,
      stats: scaleStatsForFloor(template.base, floorLevel, 2.4),
      position,
      xpReward: 60 + floorLevel * 18,
      goldReward: 50 + floorLevel * 12,
      aggroRadius: template.aggroRadius + 2,
      color: 0xff4d4d,
    };
  }
  const pool = availableTemplates(floorLevel);
  const template = rng.pick(pool);
  const stats = scaleStatsForFloor(template.base, floorLevel);
  return {
    id: nanoid(8),
    kind: template.kind,
    name: template.name,
    icon: template.icon,
    isBoss: false,
    stats,
    position,
    xpReward: Math.round(6 + floorLevel * 2.2),
    goldReward: Math.round(3 + floorLevel * 1.4),
    aggroRadius: template.aggroRadius,
    color: template.color,
  };
}

function randomFloorTileInRoom(room: Room, rng: RNG, taken: Set<string>): Position {
  for (let attempt = 0; attempt < 20; attempt++) {
    const x = rng.int(room.x, room.x + room.w - 1);
    const y = rng.int(room.y, room.y + room.h - 1);
    const key = `${x},${y}`;
    if (!taken.has(key)) {
      taken.add(key);
      return { x, y };
    }
  }
  return roomCenter(room);
}

export function generateFloor(floorLevel: number, luck: number, rng: RNG): DungeonFloor {
  const width = DUNGEON_WIDTH;
  const height = DUNGEON_HEIGHT;
  const tiles = createEmptyGrid(width, height);
  const roomCount = rng.int(MIN_ROOMS, MAX_ROOMS);
  const rooms: Room[] = [];

  for (let i = 0; i < roomCount; i++) {
    let placed = false;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) {
      const w = rng.int(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
      const h = rng.int(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
      const x = rng.int(1, width - w - 2);
      const y = rng.int(1, height - h - 2);
      const room: Room = { x, y, w, h };
      if (rooms.some((r) => roomsOverlap(r, room))) continue;
      rooms.push(room);
      carveRoom(tiles, room);
      placed = true;
    }
  }

  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(tiles, roomCenter(rooms[i - 1]), roomCenter(rooms[i]), rng);
  }

  const startRoom = rooms[0];
  const playerStart = roomCenter(startRoom);

  let stairsRoom = rooms[0];
  let maxDist = -1;
  for (const room of rooms) {
    const c = roomCenter(room);
    const dist = Math.abs(c.x - playerStart.x) + Math.abs(c.y - playerStart.y);
    if (dist > maxDist) {
      maxDist = dist;
      stairsRoom = room;
    }
  }
  const stairsPosition = roomCenter(stairsRoom);
  tiles[stairsPosition.y][stairsPosition.x].type = TileType.STAIRS;

  const taken = new Set<string>([`${playerStart.x},${playerStart.y}`, `${stairsPosition.x},${stairsPosition.y}`]);
  const enemies: EnemyEntity[] = [];
  const groundItems: GroundItem[] = [];
  const isBossFloor = floorLevel % 5 === 0;

  rooms.forEach((room, index) => {
    if (index === 0) return;
    const isStairsRoom = room === stairsRoom;

    if (isBossFloor && isStairsRoom) {
      const pos = randomFloorTileInRoom(room, rng, taken);
      enemies.push(spawnEnemyAt(pos, floorLevel, rng, true));
    } else {
      const enemyCount = rng.int(1, 3);
      for (let i = 0; i < enemyCount; i++) {
        if (rng.chance(0.75)) {
          const pos = randomFloorTileInRoom(room, rng, taken);
          enemies.push(spawnEnemyAt(pos, floorLevel, rng, false));
        }
      }
    }

    if (rng.chance(0.55)) {
      const pos = randomFloorTileInRoom(room, rng, taken);
      groundItems.push({ id: nanoid(8), position: pos, kind: 'gold', amount: generateGoldAmount(floorLevel, luck, rng) });
    }
    if (rng.chance(0.4)) {
      const pos = randomFloorTileInRoom(room, rng, taken);
      groundItems.push({ id: nanoid(8), position: pos, kind: 'item', item: generateItem(floorLevel, luck, rng) });
    }
    if (rng.chance(0.18)) {
      const pos = randomFloorTileInRoom(room, rng, taken);
      groundItems.push({ id: nanoid(8), position: pos, kind: 'potion' });
    }
  });

  return {
    level: floorLevel,
    width,
    height,
    tiles,
    enemies,
    groundItems,
    stairsPosition,
    playerStart,
  };
}
