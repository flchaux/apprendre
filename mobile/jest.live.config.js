// Test de contrat contre l'API de production : environnement Node sans les simulations de React Native
// (le preset jest-expo remplace fetch). Voir src/api/contract.live.test.ts.
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/api/contract.live.test.ts'],
  transform: { '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
