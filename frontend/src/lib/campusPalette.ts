/**
 * Campus Twin color palettes for Day and Ops modes.
 *
 * This is the single source of truth for Campus Twin theming. Components must
 * reference these tokens (via the helpers in CampusTheme.tsx) instead of
 * hard-coded colors, so both themes stay readable and consistent.
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
  /** Readable text color placed on top of `accent`. */
  accentText: string;

  // Status (semantic, meaning preserved across themes)
  success: string;
  warning: string;
  critical: string;
  maintenance: string;

  // Map text
  textHigh: string;
  textMid: string;
  textLow: string;

  // Panels
  panelBg: string;
  panelBorder: string;
  /** Text on panels. */
  panelTextHigh: string;
  panelTextMid: string;
  panelTextMuted: string;

  // Surfaces (cards, sections)
  surfaceBg: string;
  surfaceBorder: string;
  surfaceHover: string;

  // Controls (buttons, toggles)
  controlBg: string;
  controlBorder: string;
  controlText: string;
  controlHoverBg: string;
  controlActiveBg: string;

  // Inputs
  inputBg: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;

  // Focus
  focusRing: string;

  // Tooltip
  tooltipBg: string;
  tooltipText: string;

  // Disabled controls
  disabledBg: string;
  disabledText: string;

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
  accentText: '#FFFFFF',

  success: '#16A34A',
  warning: '#B45309',
  critical: '#DC2626',
  maintenance: '#7C3AED',

  textHigh: '#0F172A',
  textMid: '#475569',
  textLow: '#64748B',

  panelBg: '#FFFFFF',
  panelBorder: '#E2E8F0',
  panelTextHigh: '#0F172A',
  panelTextMid: '#475569',
  panelTextMuted: '#64748B',

  surfaceBg: '#FFFFFF',
  surfaceBorder: '#E2E8F0',
  surfaceHover: '#F1F5F9',

  controlBg: '#FFFFFF',
  controlBorder: '#CBD5E1',
  controlText: '#0F172A',
  controlHoverBg: '#F1F5F9',
  controlActiveBg: '#E0E7FF',

  inputBg: '#FFFFFF',
  inputBorder: '#CBD5E1',
  inputText: '#0F172A',
  inputPlaceholder: '#94A3B8',

  focusRing: '#4F46E5',

  tooltipBg: '#0F172A',
  tooltipText: '#F8FAFC',

  disabledBg: '#F1F5F9',
  disabledText: '#94A3B8',

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
  accentText: '#04121F',

  success: '#34D399',
  warning: '#FBBF24',
  critical: '#FB7185',
  maintenance: '#A78BFA',

  textHigh: '#E6F4FF',
  textMid: '#B6CADF',
  textLow: '#8FA9C4',

  panelBg: 'rgba(9, 22, 42, 0.92)',
  panelBorder: 'rgba(34, 211, 238, 0.28)',
  panelTextHigh: '#E6F4FF',
  panelTextMid: '#B6CADF',
  panelTextMuted: '#8FA9C4',

  surfaceBg: 'rgba(9, 22, 42, 0.92)',
  surfaceBorder: 'rgba(34, 211, 238, 0.28)',
  surfaceHover: 'rgba(34, 211, 238, 0.12)',

  controlBg: 'rgba(13, 30, 54, 0.92)',
  controlBorder: 'rgba(34, 211, 238, 0.35)',
  controlText: '#E6F4FF',
  controlHoverBg: 'rgba(34, 211, 238, 0.16)',
  controlActiveBg: 'rgba(34, 211, 238, 0.24)',

  inputBg: 'rgba(9, 22, 42, 0.92)',
  inputBorder: 'rgba(34, 211, 238, 0.35)',
  inputText: '#E6F4FF',
  inputPlaceholder: '#7F98B3',

  focusRing: '#22D3EE',

  tooltipBg: '#0B1B33',
  tooltipText: '#E6F4FF',

  disabledBg: 'rgba(148, 163, 184, 0.15)',
  disabledText: '#7F98B3',

  glow: '0 0 24px rgba(34, 211, 238, 0.28)',
};

export function getPalette(mode: ColorMode): CampusPalette {
  return mode === 'ops' ? opsPalette : dayPalette;
}