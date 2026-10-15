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
  {
    files: ['apps/mobile/**/*.{js,jsx,ts,tsx}'],
    settings: {
      'import/resolver': {
        typescript: { project: 'apps/mobile/tsconfig.json' },
        node: true,
      },
    },
  },
  {
    // Design tokens only: no loose colors or type/radius numbers outside the theme.
    files: ['apps/mobile/src/**/*.{ts,tsx}'],
    ignores: ['apps/mobile/src/theme/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/]',
          message: 'Use a color token from src/theme instead of a hex literal.',
        },
        {
          selector: 'Literal[value=/^rgba?\\(/]',
          message: 'Use a color token from src/theme instead of rgb()/rgba().',
        },
        {
          selector:
            'Property[key.name=/^(fontSize|lineHeight|letterSpacing|borderRadius|fontWeight)$/] > Literal',
          message: 'Use a typography/radius token from src/theme instead of a literal value.',
        },
      ],
    },
  },
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
