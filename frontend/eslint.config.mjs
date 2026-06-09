import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    rules: {
      // O'zbek tilidagi UI matnida apostrof (o', g', tutuq belgisi) — oddiy harf.
      // Har birini &apos; ga aylantirish manbani o'qishni qiyinlashtiradi.
      'react/no-unescaped-entities': 'off',
      // `_` bilan boshlanuvchi argument/o'zgaruvchi — atayin ishlatilmagan.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];

export default eslintConfig;
