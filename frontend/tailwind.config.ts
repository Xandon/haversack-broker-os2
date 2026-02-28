import forms from '@tailwindcss/forms';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '320px',
      },
    },
  },
  plugins: [forms],
};

export default config;
