import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-useless-assignment": "warn",
      "no-console": "off",
    },
  },
  {
    ignores: [
      "dist/**",
      "public/**",
      "node_modules/**",
      "void_core/**",
      "void_runner/**",
      "eternet_ts/**",
      "server/**",
      "contracts/**",
      "core/**",
      "android/**",
      "scripts/**",
      "src/**/*.test.ts",
      "src/**/*.test.tsx",
      "src/**/*.stress.test.ts",
      "src/test/**",
    ],
  },
);
