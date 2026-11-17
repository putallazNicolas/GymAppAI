/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts?(x)'],
  // Reanimated 4 / Worklets: resolve their web (non-native) modules under Jest.
  resolver: 'react-native-reanimated/jest/resolver',
};
