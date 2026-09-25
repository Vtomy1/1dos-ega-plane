import { RgbColor } from '../types/dos';

// Standard 16-color EGA palette (used in QBasic SCREEN 7: 320x200 16-color)
export const EGA_16_PALETTE: RgbColor[] = [
  { index: 0,  r: 0,   g: 0,   b: 0,   name: '0: Black',         hex: '#000000' },
  { index: 1,  r: 0,   g: 0,   b: 170, name: '1: Blue',          hex: '#0000AA' },
  { index: 2,  r: 0,   g: 170, b: 0,   name: '2: Green',         hex: '#00AA00' },
  { index: 3,  r: 0,   g: 170, b: 170, name: '3: Cyan',          hex: '#00AAAA' },
  { index: 4,  r: 170, g: 0,   b: 0,   name: '4: Red',           hex: '#AA0000' },
  { index: 5,  r: 170, g: 0,   b: 170, name: '5: Magenta',       hex: '#AA00AA' },
  { index: 6,  r: 170, g: 85,  b: 0,   name: '6: Brown',         hex: '#AA5500' },
  { index: 7,  r: 170, g: 170, b: 170, name: '7: Light Gray',    hex: '#AAAAAA' },
  { index: 8,  r: 85,  g: 85,  b: 85,  name: '8: Dark Gray',     hex: '#555555' },
  { index: 9,  r: 85,  g: 85,  b: 255, name: '9: Bright Blue',   hex: '#5555FF' },
  { index: 10, r: 85,  g: 255, b: 85,  name: '10: Bright Green', hex: '#55FF55' },
  { index: 11, r: 85,  g: 255, b: 255, name: '11: Bright Cyan',  hex: '#55FFFF' },
  { index: 12, r: 255, g: 85,  b: 85,  name: '12: Bright Red',   hex: '#FF5555' },
  { index: 13, r: 255, g: 85,  b: 255, name: '13: Bright Magenta', hex: '#FF55FF' },
  { index: 14, r: 255, g: 255, b: 85,  name: '14: Yellow',       hex: '#FFFF55' },
  { index: 15, r: 255, g: 255, b: 255, name: '15: Bright White', hex: '#FFFFFF' },
];

// CGA Mode 4 Palette 1 (High Intensity: Black, Cyan, Magenta, White)
export const CGA_4_PALETTE: RgbColor[] = [
  { index: 0, r: 0,   g: 0,   b: 0,   name: '0: Black',   hex: '#000000' },
  { index: 1, r: 85,  g: 255, b: 255, name: '1: Cyan',    hex: '#55FFFF' },
  { index: 2, r: 255, g: 85,  b: 255, name: '2: Magenta', hex: '#FF55FF' },
  { index: 3, r: 255, g: 255, b: 255, name: '3: White',   hex: '#FFFFFF' },
];

// Generate standard VGA 256-color palette (Mode 13h default)
export function getStandardVga256Palette(): RgbColor[] {
  const palette: RgbColor[] = [];
  
  // First 16 colors: standard EGA 16
  for (let i = 0; i < 16; i++) {
    palette.push({
      ...EGA_16_PALETTE[i],
      index: i,
    });
  }

  // Next 16 colors: 16 shades of gray
  for (let i = 0; i < 16; i++) {
    const val = Math.round((i / 15) * 255);
    palette.push({
      index: 16 + i,
      r: val,
      g: val,
      b: val,
      name: `${16 + i}: Gray ${i}`,
      hex: `#${val.toString(16).padStart(2, '0').repeat(3)}`,
    });
  }

  // Next 216 colors: 6x6x6 color cube (or standard 72 color ramp x 3 saturations)
  // To match standard VGA BIOS INT 10h:
  // Colors 32 to 247 are 3 groups of 72 colors with varying saturations
  for (let group = 0; group < 3; group++) {
    const intensity = group === 0 ? 1.0 : group === 1 ? 0.65 : 0.4;
    for (let h = 0; h < 24; h++) {
      const hue = (h / 24) * 360;
      const [r, g, b] = hslToRgb(hue, 1.0, 0.5 * intensity);
      const idx = 32 + group * 24 + h;
      palette.push({
        index: idx,
        r,
        g,
        b,
        name: `${idx}: Hue ${Math.round(hue)}°`,
        hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
      });
    }
  }

  // Fill up to 256 with extra distinct tones if needed
  while (palette.length < 256) {
    const i = palette.length;
    const v = Math.round(((i - 104) / (256 - 104)) * 255);
    palette.push({
      index: i,
      r: v,
      g: Math.round(v * 0.8),
      b: Math.round(v * 0.6),
      name: `${i}: Warm Tone`,
      hex: `#${v.toString(16).padStart(2, '0')}${Math.round(v * 0.8).toString(16).padStart(2, '0')}${Math.round(v * 0.6).toString(16).padStart(2, '0')}`,
    });
  }

  return palette.slice(0, 256);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;

  if (0 <= h && h < 60) {
    r1 = c; g1 = x; b1 = 0;
  } else if (60 <= h && h < 120) {
    r1 = x; g1 = c; b1 = 0;
  } else if (120 <= h && h < 180) {
    r1 = 0; g1 = c; b1 = x;
  } else if (180 <= h && h < 240) {
    r1 = 0; g1 = x; b1 = c;
  } else if (240 <= h && h < 300) {
    r1 = x; g1 = 0; b1 = c;
  } else if (300 <= h && h < 360) {
    r1 = c; g1 = 0; b1 = x;
  }

  return [
    Math.min(255, Math.max(0, Math.round((r1 + m) * 255))),
    Math.min(255, Math.max(0, Math.round((g1 + m) * 255))),
    Math.min(255, Math.max(0, Math.round((b1 + m) * 255))),
  ];
}

// Perceptual distance formula (weighted Euclidean approximating human eye sensitivity)
export function colorDistanceSq(
  r1: number, g1: number, b1: number,
  r2: number, g2: number, b2: number
): number {
  const rmean = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  // Approximation of CIE76/Delta-E:
  return (((512 + rmean) * dr * dr) >> 8) + 4 * dg * dg + (((767 - rmean) * db * db) >> 8);
}

export function findNearestColorIndex(
  r: number,
  g: number,
  b: number,
  palette: RgbColor[]
): number {
  let bestDist = Infinity;
  let bestIndex = 0;

  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    const dist = colorDistanceSq(r, g, b, c.r, c.g, c.b);
    if (dist < bestDist) {
      bestDist = dist;
      bestIndex = i;
      if (dist === 0) break;
    }
  }

  return bestIndex;
}
