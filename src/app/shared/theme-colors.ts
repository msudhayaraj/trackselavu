export type ThemeColorName = 'blue' | 'teal' | 'purple' | 'indigo' | 'green' | 'pink';

export const THEME_COLOR_NAMES: ThemeColorName[] = ['blue', 'teal', 'purple', 'indigo', 'green', 'pink'];

/** Must match the Material hue-700 palette used for each `.theme-*` class in styles.scss. */
export const THEME_COLOR_HEX: Record<ThemeColorName, string> = {
  blue: '#1976d2',
  teal: '#00796b',
  purple: '#7b1fa2',
  indigo: '#303f9f',
  green: '#388e3c',
  pink: '#c2185b',
};

export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export const THEME_COLOR_LABELS: Record<ThemeColorName, string> = {
  blue: 'Blue (GPay)',
  teal: 'Teal',
  purple: 'Purple',
  indigo: 'Indigo',
  green: 'Green',
  pink: 'Pink',
};
