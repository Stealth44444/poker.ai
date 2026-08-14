// Shared design tokens for the in-game HUD: a "shipboard casino" aesthetic —
// void-black glass panels with angular cut corners, a warm gold accent that
// echoes the room's firelight HDRI, and cyan/emerald/crimson signal colors
// for turn/positive/danger states. Every HUD surface (TableHUD, PlayerPlate,
// BetControls, WinnerBanner) draws from this palette so they read as one system.

export const color = {
  void: 'rgba(6, 7, 10, 0.88)',
  voidSolid: '#0a0b0e',
  panelBorder: 'rgba(232, 179, 74, 0.28)',
  hairline: 'rgba(255, 255, 255, 0.08)',
  text: '#eef1f5',
  textMuted: '#8b93a1',
  gold: '#e8b34a',
  goldGlow: 'rgba(232, 179, 74, 0.55)',
  cyan: '#57d1ff',
  cyanGlow: 'rgba(87, 209, 255, 0.55)',
  emerald: '#3ddc84',
  emeraldGlow: 'rgba(61, 220, 132, 0.5)',
  crimson: '#ff4d5e',
  crimsonGlow: 'rgba(255, 77, 94, 0.5)',
} as const;

export const font = {
  display: 'var(--font-display), "Orbitron", sans-serif',
  body: 'var(--font-body), "Rajdhani", sans-serif',
} as const;

/** PlayerPlate anchors its nameplate to drei's <Html zIndexRange={[20, 0]}>,
 * which stacks by explicit z-index regardless of DOM order — any 2D overlay
 * without its own z-index can end up rendered behind it. Every top-level HUD
 * panel (TableHUD, BetControls, WinnerBanner, etc.) should set this. */
export const hudZIndex = 50;

/** Angular cut-corner frame used by every HUD panel — the shared silhouette
 * that makes disparate overlays (pot readout, nameplate, bet controls) read
 * as one instrument panel instead of unrelated floating boxes. */
export const cutCorners = (size = 10): string =>
  `polygon(${size}px 0, 100% 0, 100% calc(100% - ${size}px), calc(100% - ${size}px) 100%, 0 100%, 0 ${size}px)`;

export const panelBase: React.CSSProperties = {
  background: color.void,
  border: `1px solid ${color.panelBorder}`,
  backdropFilter: 'blur(6px)',
  fontFamily: font.body,
  color: color.text,
};

export const suitColor: Record<string, string> = {
  h: '#ff6b7a',
  d: '#ff6b7a',
  s: '#dfe4ea',
  c: '#dfe4ea',
};

export const suitGlyph: Record<string, string> = {
  h: '♥', d: '♦', s: '♠', c: '♣',
};
