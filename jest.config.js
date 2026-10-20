// Exercise calendar logic in a zone with daylight-saving transitions.
process.env.TZ = 'America/Denver';

module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.scaffold/'],
};
