// @ts-check
import tseslint from 'typescript-eslint';
import expoConfig from 'eslint-config-expo/flat.js';
import prettier from 'eslint-config-prettier';

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/expo-env.d.ts',
    ],
  },
  // Mobile app: Expo's recommended rules.
  ...expoConfig.map((c) => ({ ...c, files: c.files ?? ['apps/mobile/**/*.{js,jsx,ts,tsx}'] })),
  // Core package: plain TypeScript.
  ...tseslint.configs.recommended.map((c) => ({ ...c, files: ['packages/core/**/*.ts'] })),
  {
    files: ['packages/core/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    ignores: ['packages/core/src/**/*.test.ts'],
    rules: {
      // Core must stay UI-agnostic.
      'no-restricted-imports': [
        'error',
        { paths: ['react', 'react-native'], patterns: ['expo-router', '@gym/mobile'] },
      ],
    },
  },
  prettier,
];
