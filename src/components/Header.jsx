/**
 * VenueMind — Content Delivery Portal
 * Header.jsx  |  CDP-032  |  Brand-aligned portal header
 *
 * Props:
 *   subProduct  {string}  Sub-product label e.g. "Content Portal"  (required)
 *   actions     {node}    Right-side slot — nav links, user avatar, etc.  (optional)
 */

import React from 'react';

/* ── Hex mark SVG ─────────────────────────────────────────────
   Six-spoke hex consistent with the VenueMind Intelligence header.
   Primary spoke in teal (#00A9CE), remainder in navy (#002137) at 40% opacity.
   Matches the "location-pin with network nodes" direction from the rebrand. */
const HexMark = () => (
  <svg
    width="28"
    height="32"
    viewBox="0 0 28 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    style={{ flexShrink: 0 }}
  >
    {/* Hex outline */}
    <path
      d="M14 2L26 9V23L14 30L2 23V9L14 2Z"
      fill="none"
      stroke="#102a43"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Node spokes — all six unified blue */}
    <g stroke="#00a4d3" strokeWidth="1.3" strokeLinecap="round">
      <line x1="14" y1="16" x2="14" y2="4"/>
      <line x1="14" y1="16" x2="14" y2="28"/>
      <line x1="14" y1="16" x2="23" y2="10.5"/>
      <line x1="14" y1="16" x2="5"  y2="10.5"/>
      <line x1="14" y1="16" x2="23" y2="21.5"/>
      <line x1="14" y1="16" x2="5"  y2="21.5"/>
    </g>
    {/* Outer nodes — all six unified blue */}
    <g fill="#00a4d3">
      <circle cx="14" cy="4"    r="1.6"/>
      <circle cx="14" cy="28"   r="1.6"/>
      <circle cx="23" cy="10.5" r="1.6"/>
      <circle cx="5"  cy="10.5" r="1.6"/>
      <circle cx="23" cy="21.5" r="1.6"/>
      <circle cx="5"  cy="21.5" r="1.6"/>
    </g>
    {/* Centre dot */}
    <circle cx="14" cy="16" r="3" fill="#00a4d3"/>
  </svg>
);

/* ── Header ──────────────────────────────────────────────────── */
const Header = ({ subProduct = 'Content Portal', actions }) => (
  <header style={styles.header}>
    {/* Left: mark + wordmark stack */}
    <div style={styles.brand}>
      <HexMark />
      <div style={styles.wordmarkStack}>
        <div style={styles.wordmark}>
          <span style={styles.wordmarkVenue}>Venue</span>
          <span style={styles.wordmarkMind}>Mind</span>
          {subProduct && (
            <span style={styles.subProduct}>{subProduct}</span>
          )}
        </div>
        <div style={styles.tagline}>AI-NATIVE VENUE INTELLIGENCE</div>
      </div>
    </div>

    {/* Right: caller-supplied actions */}
    {actions && (
      <div style={styles.actions}>
        {actions}
      </div>
    )}
  </header>
);

/* ── Inline styles (mirrors CSS variables for portability) ───── */
const styles = {
  header: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    height:          '56px',
    padding:         '0 20px',
    background:      '#EBF2F5',
    borderBottom:    '1px solid #D4E0E6',
    position:        'sticky',
    top:             0,
    zIndex:          100,
    flexShrink:      0,
  },
  brand: {
    display:    'flex',
    alignItems: 'center',
    gap:        '10px',
  },
  wordmarkStack: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '1px',
  },
  wordmark: {
    display:    'flex',
    alignItems: 'baseline',
    gap:        '0',
    lineHeight: 1,
  },
  wordmarkVenue: {
    fontFamily:  "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    fontSize:    '20px',
    fontWeight:  700,
    color:       '#002137',
    letterSpacing: '-0.01em',
  },
  wordmarkMind: {
    fontFamily:  "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    fontSize:    '20px',
    fontWeight:  700,
    color:       '#00A9CE',
    letterSpacing: '-0.01em',
  },
  subProduct: {
    fontFamily:  "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    fontSize:    '14px',
    fontWeight:  500,
    color:       '#707C84',
    marginLeft:  '8px',
    paddingLeft: '8px',
    borderLeft:  '1px solid #D4E0E6',
    lineHeight:  '20px',
  },
  tagline: {
    fontFamily:   "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    fontSize:     '9px',
    fontWeight:   500,
    color:        '#707C84',
    letterSpacing:'2px',
    textTransform:'uppercase',
    lineHeight:   1,
  },
  actions: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
  },
};

export default Header;
