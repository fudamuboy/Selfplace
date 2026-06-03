/**
 * Layout.ts — Selfplace Responsive System
 *
 * Single source of truth for responsive breakpoints and content widths.
 * Import from here instead of hardcoding widths in individual screens.
 *
 * UI/UX ONLY — no business logic, no navigation, no auth.
 */

import { Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Device Detection ─────────────────────────────────────────────────────────

/** True when the device is a tablet (width ≥ 768 logical points) */
export const isTablet = screenWidth >= 768;

/** True when the device is in landscape orientation */
export const isLandscape = screenWidth > screenHeight;

// ─── Breakpoints ──────────────────────────────────────────────────────────────

export const BREAKPOINTS = {
  /** Compact phones: iPhone SE, iPhone mini */
  compact: 375,
  /** Standard phones: iPhone standard & Pro */
  phone: 430,
  /** Small tablets: iPad Mini */
  tabletSm: 768,
  /** Medium tablets: iPad Air, iPad Pro 11" */
  tabletMd: 820,
  /** Large tablets: iPad Pro 13" */
  tabletLg: 1024,
} as const;

// ─── Content Max Widths ───────────────────────────────────────────────────────

/**
 * General content max width.
 * Prevents layouts from stretching across the full iPad screen.
 */
export const CONTENT_MAX_WIDTH = isTablet ? 680 : screenWidth;

/**
 * Auth / form max width.
 * Keeps login, register, forgot-password forms comfortably readable.
 */
export const FORM_MAX_WIDTH = isTablet ? 520 : screenWidth;

/**
 * AI chat conversation max width.
 * Prevents chat bubbles from spanning the full iPad width.
 */
export const CHAT_MAX_WIDTH = isTablet ? 620 : screenWidth;

/**
 * Modal content max width.
 */
export const MODAL_MAX_WIDTH = isTablet ? 540 : screenWidth;

// ─── Responsive Spacing ───────────────────────────────────────────────────────

/** Standard horizontal page padding */
export const PAGE_PADDING_H = isTablet ? 32 : 24;

/** Standard vertical page padding (top) */
export const PAGE_PADDING_V = isTablet ? 48 : 24;

/** Standard gap between cards */
export const CARD_GAP = isTablet ? 20 : 16;

// ─── Responsive Scale Helpers ─────────────────────────────────────────────────

/** Width percentage of screen */
export const wp = (percent: number) => (screenWidth * percent) / 100;

/** Height percentage of screen */
export const hp = (percent: number) => (screenHeight * percent) / 100;

// ─── Centered Container Style ─────────────────────────────────────────────────

/**
 * Returns a style object that centers content horizontally
 * and constrains it to `maxWidth`.
 *
 * Usage:
 *   <View style={centeredContainer(CONTENT_MAX_WIDTH)}>
 */
export const centeredContainer = (maxWidth: number = CONTENT_MAX_WIDTH) => ({
  width: '100%' as const,
  maxWidth,
  alignSelf: 'center' as const,
});

// ─── Exports ──────────────────────────────────────────────────────────────────

export { screenWidth, screenHeight };
