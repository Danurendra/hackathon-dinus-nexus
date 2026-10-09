'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import type { CampusPalette } from '@/lib/campusPalette';

/**
 * Theme-aware style helpers for Campus Twin.
 *
 * These keep panel/control/input colors consistent across the Day and Ops
 * palettes without touching the shared UI primitives (which serve other pages).
 */

export function panelStyle(p: CampusPalette): CSSProperties {
  return {
    backgroundColor: p.surfaceBg,
    border: `1px solid ${p.surfaceBorder}`,
    color: p.panelTextHigh,
    borderRadius: 12,
    boxShadow: p.glow === 'none' ? '0 1px 2px rgba(15, 23, 42, 0.06)' : p.glow,
  };
}

export function inputStyle(p: CampusPalette): CSSProperties {
  return {
    backgroundColor: p.inputBg,
    border: `1px solid ${p.inputBorder}`,
    color: p.inputText,
    borderRadius: 6,
    padding: '4px 8px',
    fontSize: 13,
    width: '100%',
    outlineColor: p.focusRing,
  };
}

export function statusColor(p: CampusPalette, status: string): string {
  switch (status) {
    case 'operational':
      return p.success;
    case 'attention':
      return p.warning;
    case 'critical':
      return p.critical;
    case 'maintenance':
      return p.maintenance;
    default:
      return p.textMid;
  }
}

export function badgeStyle(p: CampusPalette, tone: string): CSSProperties {
  const map: Record<string, string> = {
    success: p.success,
    warning: p.warning,
    critical: p.critical,
    info: p.accent,
    neutral: p.textMid,
  };
  const color = map[tone] ?? p.textMid;
  return {
    color,
    border: `1px solid ${color}`,
    backgroundColor: 'transparent',
    borderRadius: 9999,
    padding: '1px 8px',
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.2,
    whiteSpace: 'nowrap',
  };
}

interface CampusButtonProps {
  palette: CampusPalette;
  children: ReactNode;
  onClick?: () => void;
  variant?: 'outline' | 'primary' | 'ghost';
  disabled?: boolean;
  active?: boolean;
  title?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit';
}

export function CampusButton({
  palette,
  children,
  onClick,
  variant = 'outline',
  disabled = false,
  active = false,
  title,
  ariaLabel,
  type = 'button',
}: CampusButtonProps) {
  const [hover, setHover] = useState(false);

  const isPrimary = variant === 'primary';
  const isGhost = variant === 'ghost';

  let backgroundColor = isPrimary ? palette.accent : isGhost ? 'transparent' : palette.controlBg;
  if (!disabled && hover) {
    backgroundColor = isPrimary ? palette.accentSecondary : palette.controlHoverBg;
  }
  if (active) {
    backgroundColor = isPrimary ? palette.accent : palette.controlActiveBg;
  }
  if (disabled) {
    backgroundColor = palette.disabledBg;
  }

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors"
      style={{
        padding: '6px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor,
        color: isPrimary
          ? palette.accentText
          : disabled
          ? palette.disabledText
          : palette.controlText,
        border: isGhost
          ? '1px solid transparent'
          : `1px solid ${isPrimary ? palette.accent : palette.controlBorder}`,
        outlineColor: palette.focusRing,
      }}
    >
      {children}
    </button>
  );
}