import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // 将TypeScript相关的错误降级为警告
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "prefer-const": "warn",

      // React相关
      "react/no-unescaped-entities": "warn",
      "jsx-a11y/alt-text": "warn",

      // Next.js相关
      "@next/next/no-img-element": "warn",

      // React Hooks
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
