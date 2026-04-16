import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // Test-Dateien: no-explicit-any lockern (Vitest-Mocks benötigen `as any`)
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/tests/**', '**/e2e/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default eslintConfig;
