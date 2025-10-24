import { Inter, Noto_Sans_Arabic, Playfair_Display } from 'next/font/google';

export const sansFont = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const displayFont = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const arabicFont = Noto_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-rtl',
  display: 'swap',
});

export const fontVariables = `${sansFont.variable} ${displayFont.variable} ${arabicFont.variable}`;
