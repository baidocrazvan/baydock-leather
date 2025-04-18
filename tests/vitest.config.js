import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Enable global test APIs like `describe`, `it`, etc.
    environment: 'node', // Use Node.js environment for backend testing
    setupFiles: './tests/setup.js', // Path to your setup file
  },
});