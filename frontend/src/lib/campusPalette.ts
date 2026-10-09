/**
 * Campus Twin color palettes for Day and Ops modes.
 * All components should reference this file instead of writing hex literals.
 */

export type ColorMode = 'day' | 'ops';

export interface CampusPalette {
  // Background
  sky: string;
  ground: string;
  groundTexture: string;

  // Roads
  roadCasing: string;
  roadSurface: string;
  roadMarking: string;

  // Buildings
  roofGradientStart: string;
  roofGradientEnd: string;
  wallSunlit: string;
  wallShaded: string;
  windowOff: string;
  windowOn: string;
  windowSelected: string;

  // Vegetation
  canopyDark: string;
  canopyMid: string;
  canopyLight: string;
  canopyHighlight: string;

  // Accents
  accent: string;
  accentSecondary: string;

  // Status
  success: string;
  warning: string;
  critical: string;
  maintenance: string;

  // Text
  textHigh: string;
  textMid: string;
  textLow: string;

  // Panels
  panelBg: string;
  panelBorder: string;

  // Glow (ops only)
  glow: string;
}

export const dayPalette: CampusPalette = {
  sky: '#EAF2FB',
  ground: '#E8EFE6',
  groundTexture: '#DCE6DA',

  roadCasing: '#CFD8E3',
  roadSurface: '#FFFFFF',
  roadMarking: '#94A3B8',

  roofGradientStart: '#C9D6E6',
  roofGradientEnd: '#E3EBF5',
  wallSunlit: '#DCE6F2',
  wallShaded: '#B9C7D9',
  windowOff: '#9FB6CE',
  windowOn: '#7C93AD',
  windowSelected: '#4F46E5',

  canopyDark: '#9CC49A',
  canopyMid: '#7FB37F',
  canopyLight: '#5F9A6B',
  canopyHighlight: '#4A8A5A',

  accent: '#4F46E5',
  accentSecondary: '#0EA5E9',

  success: '#16A34A',
  warning: '#D97706',
  critical: '#DC2626',
  maintenance: '#7C3AED',

  textHigh: '#0F172A',
  textMid: '#64748B',
  textLow: '#94A3B8',

  panelBg: '#FFFFFF',
  panelBorder: '#E2E8F0',

  glow: 'none',
};

export const opsPalette: CampusPalette = {
  sky: '#040B1A',
  ground: '#0B1B33',
  groundTexture: '#10253F',

  roadCasing: '#16304F',
  roadSurface: '#1D3A5C',
  roadMarking: 'rgba(79, 216, 232, 0.5)',

  roofGradientStart: '#1B3A63',
  roofGradientEnd: '#2A5484',
  wallSunlit: '#17324F',
  wallShaded: '#0F2338',
  windowOff: '#38566F',
  windowOn: 'rgba(127, 227, 245, 0.35)',
  windowSelected: '#7FE3F5',

  canopyDark: '#0F3B3A',
  canopyMid: '#14504A',
  canopyLight: '#1B6B5C',
  canopyHighlight: '#2E8B7A',

  accent: '#22D3EE',
  accentSecondary: '#5B8CFF',

  success: '#34D399',
  warning: '#FBBF24',
  critical: '#FB7185',
  maintenance: '#A78BFA',

  textHigh: '#E6F4FF',
  textMid: '#8FA9C4',
  textLow: '#5C7691',

  panelBg: 'rgba(9, 22, 42, 0.72)',
  panelBorder: 'rgba(34, 211, 238, 0.22)',

  glow: '0 0 24px rgba(34, 211, 238, 0.28)',
};

export function getPalette(mode: ColorMode): CampusPalette {
  return mode === 'ops' ? opsPalette : dayPalette;
}
