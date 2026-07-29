module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^uniwind$': '<rootDir>/tests/mocks/uniwind.js',
  },
  collectCoverageFrom: [
    'src/mocks/**/*.{ts,tsx}',
    'src/i18n/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
