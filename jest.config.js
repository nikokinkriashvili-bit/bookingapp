// Unit tests target the pure-logic lib modules (no RN component rendering yet).
// jest-expo pins the SDK-54-compatible transform; the moduleNameMapper mirrors
// the `@/` → `src/` alias from tsconfig so tests import the same way the app does.
module.exports = {
  preset: "jest-expo",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
};
