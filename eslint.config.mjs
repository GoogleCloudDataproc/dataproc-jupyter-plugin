// @ts-check
// ESLint flat config (ESLint 9+). Replaces the legacy "eslintConfig" / "eslintIgnore"
// blocks that used to live in package.json.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  // Files/dirs that were previously in the "eslintIgnore" field.
  globalIgnores([
    '**/node_modules/**',
    '**/lib/**',
    '**/dist/**',
    '**/coverage/**',
    '**/*.d.ts',
    'tests/**',
    '**/__tests__/**',
    'ui-tests/**',
    'ui-tests-*/**',
    'dataproc_jupyter_plugin/**' // built labextension output
  ]),

  // Base recommended rule sets.
  js.configs.recommended,
  tseslint.configs.recommended,
  storybook.configs['flat/recommended'],

  // Project rules (ported from the old package.json "eslintConfig").
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: { sourceType: 'module' },
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^I[A-Z]', match: true }
        }
      ],
      '@typescript-eslint/no-unused-vars': ['warn', { args: 'none' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-use-before-define': 'off',
      curly: ['error', 'all'],
      eqeqeq: 'error',
      'prefer-arrow-callback': 'error'
      // NOTE: the old "@typescript-eslint/quotes" rule was dropped — it was removed
      // in typescript-eslint v8 and quote style is already enforced by Prettier
      // (singleQuote: true), which runs as a separate `jlpm prettier` step.
    }
  },

  // Must be last: turns off ESLint rules that conflict with Prettier. Formatting
  // itself is handled by the standalone `prettier` / `prettier:check` scripts,
  // not by ESLint (the recommended setup — avoids running Prettier as a lint rule).
  eslintConfigPrettier
]);
