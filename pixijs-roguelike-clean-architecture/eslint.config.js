// ============================================================================
// ESLint flat config (ESLint v9 + typescript-eslint).
//
// Beyond the standard recommended rules, this config ENFORCES the Clean
// Architecture dependency rule with `no-restricted-imports`:
//   - domain        -> must NOT import application / presentation / infrastructure
//   - application   -> must NOT import presentation
//   - presentation  -> must NOT import infrastructure
// Dependencies must point inward. A future tightening can also forbid
// application -> infrastructure once the RNG seed is injected at the
// composition root instead of being called inside gameStore (#3, turnService).
// ============================================================================

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/application/**', '**/presentation/**', '**/infrastructure/**'],
              message:
                'Domain layer must not import from outer layers (Clean Architecture: dependencies point inward).',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/application/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/presentation/**'],
              message: 'Application layer must not import from presentation (dependencies point inward).',
            },
          ],
        },
      ],
    },
  },

  {
    files: ['src/presentation/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/infrastructure/**'],
              message: 'Presentation must not import infrastructure directly; go through application/domain.',
            },
          ],
        },
      ],
    },
  }
);
