// ============================================================================
// DOMAIN LAYER — central game configuration / tuning constants.
//
// Centralizing every "magic number" here (instead of scattering literals
// across services and stores) makes the game trivially tunable and means
// tests assert against named values rather than guessing intent.
//
// Only CONSTANTS live here — no logic, no imports from other layers.
// ============================================================================

// ---- Dungeon generation -----------------------------------------------------
export const DUNGEON_WIDTH = 32;
export const DUNGEON_HEIGHT = 19;
export const VISIBILITY_RADIUS = 5;
export const MIN_ROOMS = 6;
export const MAX_ROOMS = 9;
export const ROOM_MIN_SIZE = 3;
export const ROOM_MAX_SIZE = 6;

// ---- Combat: how attack damage is resolved ---------------------------------
/** Fraction of defender defense that is bypassed by a normal hit. */
export const DEFAULT_IGNORE_DEFENSE_RATIO = 0.6; // was: ignoreDefenseRatio ?? 0.6
/** Lower bound of the random ±damage multiplier. */
export const DAMAGE_VARIANCE_MIN = 0.85; // was: 0.85 + rng.next() * 0.3
/** Spread of the random ±damage multiplier. */
export const DAMAGE_VARIANCE_RANGE = 0.3; // was: the *0.3 in combatService

// ---- Loot & progression -----------------------------------------------------
/** Probability a regular enemy drops an item on death. */
export const ENEMY_DROP_CHANCE = 0.45; // was: dropChance = isBoss ? 1 : 0.45
/** Probability a boss drops an item on death (always). */
export const BOSS_DROP_CHANCE = 1; // was: isBoss ? 1 : ...

// ---- Healing ----------------------------------------------------------------
/** Fraction of max HP restored by a healing potion. */
export const POTION_HEAL_RATIO = 0.4; // was: Math.round(maxHp * 0.4) in usePotion

// ---- Run / UI bookkeeping ---------------------------------------------------
/** Maximum number of log entries retained per run. */
export const MAX_LOG_ENTRIES = 80; // was: [...].slice(-80)
