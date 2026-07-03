import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { useGameStore } from '../../application/game/gameStore';
import { CLASS_DEFINITIONS } from '../../domain/data/classDefinitions';
import { RARITY_COLOR } from '../../domain/data/itemAffixes';
import { TileType } from '../../domain/types';
import { COLORS, TILE_SIZE } from './renderConstants';

export function PixiGameCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const layersRef = useRef<{
    tiles: Graphics;
    items: Container;
    enemies: Container;
    player: Container;
  } | null>(null);
  const entityMapRef = useRef({
    items: new Map<string, Text>(),
    enemies: new Map<string, Container>(),
    player: null as Container | null,
  });

  const player = useGameStore((s) => s.player);
  const floor = useGameStore((s) => s.floor);

  useEffect(() => {
    if (!hostRef.current) return;
    let destroyed = false;
    const app = new Application();

    (async () => {
      await app.init({
        width: floor ? floor.width * TILE_SIZE : 800,
        height: floor ? floor.height * TILE_SIZE : 500,
        backgroundColor: COLORS.background,
        antialias: true,
      });
      if (destroyed || !hostRef.current) return;
      hostRef.current.appendChild(app.canvas);
      appRef.current = app;

      const tiles = new Graphics();
      const items = new Container();
      const enemies = new Container();
      const playerLayer = new Container();
      app.stage.addChild(tiles, items, enemies, playerLayer);
      layersRef.current = { tiles, items, enemies, player: playerLayer };
    })();

    return () => {
      destroyed = true;
      layersRef.current = null;
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const layers = layersRef.current;
    if (!app || !layers || !floor) return;

    const desiredW = floor.width * TILE_SIZE;
    const desiredH = floor.height * TILE_SIZE;
    if (app.renderer.width !== desiredW || app.renderer.height !== desiredH) {
      app.renderer.resize(desiredW, desiredH);
    }

    // ---- Tiles + fog ----
    const g = layers.tiles;
    g.clear();
    for (let y = 0; y < floor.height; y++) {
      for (let x = 0; x < floor.width; x++) {
        const tile = floor.tiles[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        if (!tile.explored) {
          g.rect(px, py, TILE_SIZE, TILE_SIZE).fill({ color: COLORS.fog });
          continue;
        }
        const color =
          tile.type === TileType.WALL
            ? tile.visible
              ? COLORS.wallVisible
              : COLORS.wallExplored
            : tile.type === TileType.STAIRS
              ? tile.visible
                ? COLORS.stairsVisible
                : COLORS.stairsExplored
              : tile.visible
                ? COLORS.floorVisible
                : COLORS.floorExplored;

        g.rect(px, py, TILE_SIZE, TILE_SIZE).fill({ color });
        g.rect(px, py, TILE_SIZE, TILE_SIZE).stroke({ width: 1, color: COLORS.gridLine, alpha: 0.4 });

        if (!tile.visible) {
          g.rect(px, py, TILE_SIZE, TILE_SIZE).fill({ color: 0x000000, alpha: 0.45 });
        }
        if (tile.type === TileType.STAIRS && tile.visible) {
          g.rect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8).stroke({ width: 2, color: 0xdff5df, alpha: 0.9 });
        }
      }
    }

    // ---- Ground items ----
    const itemsMap = entityMapRef.current.items;
    const currentItemIds = new Set(floor.groundItems.map((g) => g.id));
    for (const [id, text] of itemsMap.entries()) {
      if (!currentItemIds.has(id)) {
        layers.items.removeChild(text);
        text.destroy();
        itemsMap.delete(id);
      }
    }

    for (const gi of floor.groundItems) {
      const tile = floor.tiles[gi.position.y]?.[gi.position.x];
      if (!tile || !tile.explored) {
        if (itemsMap.has(gi.id)) {
          itemsMap.get(gi.id)!.visible = false;
        }
        continue;
      }

      let text = itemsMap.get(gi.id);
      if (!text) {
        const icon = gi.kind === 'gold' ? '💰' : gi.kind === 'potion' ? '🧪' : gi.item.icon;
        const color = gi.kind === 'gold' || gi.kind === 'potion' ? 0xffffff : RARITY_COLOR[gi.item.rarity];
        const style = new TextStyle({ fontSize: TILE_SIZE * 0.6, fill: color });
        text = new Text({ text: icon, style });
        text.anchor.set(0.5);
        layers.items.addChild(text);
        itemsMap.set(gi.id, text);
      }

      text.visible = true;
      text.alpha = tile.visible ? 1 : 0.4;
      text.x = gi.position.x * TILE_SIZE + TILE_SIZE / 2;
      text.y = gi.position.y * TILE_SIZE + TILE_SIZE / 2;
    }

    // ---- Enemies ----
    const enemiesMap = entityMapRef.current.enemies;
    const currentEnemyIds = new Set(floor.enemies.map((e) => e.id));
    for (const [id, wrapper] of enemiesMap.entries()) {
      if (!currentEnemyIds.has(id)) {
        layers.enemies.removeChild(wrapper);
        wrapper.destroy({ children: true });
        enemiesMap.delete(id);
      }
    }

    for (const enemy of floor.enemies) {
      const tile = floor.tiles[enemy.position.y]?.[enemy.position.x];
      if (!tile || !tile.visible) {
        if (enemiesMap.has(enemy.id)) {
          enemiesMap.get(enemy.id)!.visible = false;
        }
        continue;
      }

      let wrapper = enemiesMap.get(enemy.id);
      if (!wrapper) {
        wrapper = new Container();
        const bg = new Graphics();
        bg.circle(0, 0, TILE_SIZE * (enemy.isBoss ? 0.46 : 0.38)).fill({ color: enemy.color, alpha: 0.35 });
        bg.circle(0, 0, TILE_SIZE * (enemy.isBoss ? 0.46 : 0.38)).stroke({ width: enemy.isBoss ? 2 : 1, color: enemy.color });
        wrapper.addChild(bg);

        const text = new Text({
          text: enemy.icon,
          style: new TextStyle({ fontSize: TILE_SIZE * (enemy.isBoss ? 0.8 : 0.62) }),
        });
        text.anchor.set(0.5);
        wrapper.addChild(text);

        const barBg = new Graphics();
        barBg.label = 'hpBar';
        wrapper.addChild(barBg);

        layers.enemies.addChild(wrapper);
        enemiesMap.set(enemy.id, wrapper);
      }

      wrapper.visible = true;
      wrapper.x = enemy.position.x * TILE_SIZE + TILE_SIZE / 2;
      wrapper.y = enemy.position.y * TILE_SIZE + TILE_SIZE / 2;

      // health bar update
      const hpBar = wrapper.getChildByLabel('hpBar') as Graphics;
      if (hpBar) {
        const hpRatio = Math.max(0, enemy.stats.hp / enemy.stats.maxHp);
        const barW = TILE_SIZE * 0.8;
        hpBar.clear();
        hpBar.rect(-barW / 2, TILE_SIZE * 0.42, barW, 3).fill({ color: 0x000000, alpha: 0.6 });
        hpBar.rect(-barW / 2, TILE_SIZE * 0.42, barW * hpRatio, 3).fill({ color: hpRatio > 0.5 ? 0x5fd671 : hpRatio > 0.25 ? 0xe0c33c : 0xe0503c });
      }
    }

    // ---- Player ----
    if (!player) {
      if (entityMapRef.current.player) {
        layers.player.removeChild(entityMapRef.current.player);
        entityMapRef.current.player.destroy({ children: true });
        entityMapRef.current.player = null;
      }
    } else {
      let wrapper = entityMapRef.current.player;
      if (!wrapper) {
        const classDef = CLASS_DEFINITIONS[player.classType];
        wrapper = new Container();

        const ring = new Graphics();
        ring.circle(0, 0, TILE_SIZE * 0.44).fill({ color: classDef.color, alpha: 0.3 });
        ring.circle(0, 0, TILE_SIZE * 0.44).stroke({ width: 2, color: COLORS.playerRing });
        wrapper.addChild(ring);

        const text = new Text({ text: classDef.icon, style: new TextStyle({ fontSize: TILE_SIZE * 0.68 }) });
        text.anchor.set(0.5);
        wrapper.addChild(text);

        layers.player.addChild(wrapper);
        entityMapRef.current.player = wrapper;
      }

      wrapper.x = player.position.x * TILE_SIZE + TILE_SIZE / 2;
      wrapper.y = player.position.y * TILE_SIZE + TILE_SIZE / 2;
    }
  }, [player, floor]);

  return (
    <div
      ref={hostRef}
      className="overflow-hidden rounded-xl border border-slate-700/60 shadow-inner shadow-black/50"
      style={{ lineHeight: 0 }}
    />
  );
}
