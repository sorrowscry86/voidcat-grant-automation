import { useColorScheme } from 'react-native';

export interface Palette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentText: string;
  accentSoft: string;
  success: string;
  warning: string;
  danger: string;
  scheme: 'light' | 'dark';
}

const light: Palette = {
  background: '#F6F7F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF2F7',
  border: '#DDE3EC',
  text: '#0B1220',
  textMuted: '#51607A',
  textFaint: '#8A97AC',
  accent: '#1D4ED8',
  accentText: '#FFFFFF',
  accentSoft: '#E4ECFD',
  success: '#0F7B45',
  warning: '#96601A',
  danger: '#B3261E',
  scheme: 'light',
};

const dark: Palette = {
  background: '#0B1220',
  surface: '#131C2E',
  surfaceAlt: '#1B2740',
  border: '#26334D',
  text: '#EEF2F8',
  textMuted: '#A3B0C6',
  textFaint: '#6F7E96',
  accent: '#5B8DEF',
  accentText: '#08111F',
  accentSoft: '#1B2C4E',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#FF6B6B',
  scheme: 'dark',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
