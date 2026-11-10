import js from "@eslint/js";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  { ignores: ["dist"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node }, parserOptions: { ecmaFeatures: { jsx: true } }, sourceType: "module" },
    plugins: { react, "react-hooks": hooks },
    settings: { react: { version: "18" } },
    rules: { ...react.configs.recommended.rules, ...hooks.configs.recommended.rules, "react/prop-types": "off", "react/react-in-jsx-scope": "off", "react/jsx-uses-vars": "error" },
  },
  { files: ["**/*.test.{js,jsx}"], languageOptions: { globals: { ...globals.vitest, describe: "readonly", it: "readonly", expect: "readonly" } } },
];
