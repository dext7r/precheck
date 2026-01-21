import nextCoreWebVitals from "eslint-config-next/core-web-vitals"

export default [
  ...nextCoreWebVitals,
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "out/**",
      "logs/**",
      "next-env.d.ts",
    ],
  },
]
