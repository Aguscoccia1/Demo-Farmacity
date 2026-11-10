module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  plugins: ["@typescript-eslint", "react-hooks", "react-refresh"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", "node_modules", "*.tsbuildinfo"],
  rules: {
    "no-undef": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    // El proyecto exporta helpers junto a componentes en algunos módulos.
    "react-refresh/only-export-components": "off",
  },
  overrides: [
    {
      files: ["*.config.js", "*.config.cjs", "*.config.ts", "vite.config.ts"],
      env: { node: true },
    },
  ],
};
