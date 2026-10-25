import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Lovable rewrites these files. previewAuthStorage.ts returns with
    // `let timer` and fails prefer-const; client.ts and types.ts are the
    // generated Supabase client. Product code stays on the rules below.
    ignores: [
      "dist",
      "android/app/build/**",
      "android/build/**",
      "android/app/src/main/assets/**",
      "ios/App/App/public/**",
      "ios/App/build/**",
      "src/integrations/supabase/client.ts",
      "src/integrations/supabase/previewAuthStorage.ts",
      "src/integrations/supabase/types.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["playwright.config.ts", "capacitor.config.ts", "e2e/**/*.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
);
