/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // Unit tests only cover pure logic in src/lib — kept free of React
  // Native/Expo imports on purpose so they run in plain Node, no RN preset
  // or native-module mocking required. Component/hook tests are a
  // separate, heavier layer (see docs/TESTING.md).
  roots: ['<rootDir>/src/lib'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
