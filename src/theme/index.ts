import React, { createContext, useContext } from 'react';

export type Palette = {
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  onAccent: string;
  pale: string;
  line: string;
  danger: string;
  success: string;
  hero: string;
  heroText: string;
  headerStart: string;
  headerEnd: string;
};
export const light: Palette = {
  bg: '#F6F8FE',
  surface: '#FFFFFF',
  ink: '#152251',
  muted: '#627097',
  accent: '#3154DB',
  onAccent: '#FFFFFF',
  pale: '#E9EEFF',
  line: '#E3E8F7',
  danger: '#C94661',
  success: '#147963',
  hero: '#E6EDFF',
  heroText: '#142B87',
  headerStart: '#F6F8FE',
  headerEnd: '#F6F8FE',
};
export const dark: Palette = {
  bg: '#0D1430',
  surface: '#17234A',
  ink: '#F3F5FF',
  muted: '#AAB6DA',
  accent: '#9EB2FF',
  onAccent: '#101C47',
  pale: '#263866',
  line: '#32426E',
  danger: '#FF8EA4',
  success: '#71D7B7',
  hero: '#1A2B68',
  heroText: '#F3F5FF',
  headerStart: '#0D1430',
  headerEnd: '#0D1430',
};
export const ThemeContext = createContext<{
  colors: Palette;
  mode: 'system' | 'light' | 'dark';
  setMode: (mode: 'system' | 'light' | 'dark') => void;
}>({ colors: light, mode: 'system', setMode: () => {} });
export const useTheme = () => useContext(ThemeContext);
