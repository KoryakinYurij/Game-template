// ============================================================================
// INFRASTRUCTURE LAYER — non-deterministic seed creation.
//
// This is the ONLY impure piece of the randomness subsystem: it reaches into
// Math.random(). Keeping it here (and out of the domain) preserves the purity
// of the domain layer. The composition root calls this once per run, then
// hands the resulting seed to the pure domain RNG.
// ============================================================================

/**
 * Produces a fresh random 32-bit seed for a new run.
 * Use at the boundary (application/composition root) only.
 */
export function createRandomSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
