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

// Helper color conversion functions
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
    return { r, g, b };
  }
  return null;
}

// Convert 8-bit RGB (0-255) to authentic MS-DOS VGA 6-bit DAC register value (0-63)
export function rgbToDac6Bit(val: number): number {
  return Math.min(63, Math.max(0, Math.floor(val / 4)));
}

// Convert 6-bit DAC register value (0-63) to 8-bit RGB (0-255) with MSB replication
export function dac6BitToRgb(dac: number): number {
  const clamped = Math.min(63, Math.max(0, dac));
  return (clamped << 2) | (clamped >> 4);
}

export function clonePalette(palette: RgbColor[]): RgbColor[] {
  return palette.map((c) => ({ ...c }));
}

// Curated 16-color Historic Retro Palettes
export const RETRO_16_PRESETS: { id: string; name: string; description: string; colors: RgbColor[] }[] = [
  {
    id: 'standard_ega',
    name: 'IBM EGA Standard',
    description: 'Classic 1984 16-color hardware default (SCREEN 7 / Mode 0Dh)',
    colors: EGA_16_PALETTE,
  },
  {
    id: 'c64_pepto',
    name: 'Commodore 64 (VIC-II)',
    description: 'Warm, muted earthy palette from the legendary 8-bit computer',
    colors: [
      { index: 0,  r: 0,   g: 0,   b: 0,   name: 'Black', hex: '#000000' },
      { index: 1,  r: 255, g: 255, b: 255, name: 'White', hex: '#FFFFFF' },
      { index: 2,  r: 136, g: 0,   b: 0,   name: 'Red', hex: '#880000' },
      { index: 3,  r: 170, g: 255, b: 238, name: 'Cyan', hex: '#AAFFEE' },
      { index: 4,  r: 204, g: 68,  b: 204, name: 'Violet', hex: '#CC44CC' },
      { index: 5,  r: 0,   g: 204, b: 85,  name: 'Green', hex: '#00CC55' },
      { index: 6,  r: 0,   g: 0,   b: 170, name: 'Blue', hex: '#0000AA' },
      { index: 7,  r: 238, g: 238, b: 119, name: 'Yellow', hex: '#EEEE77' },
      { index: 8,  r: 221, g: 136, b: 85,  name: 'Orange', hex: '#DD8855' },
      { index: 9,  r: 102, g: 68,  b: 0,   name: 'Brown', hex: '#664400' },
      { index: 10, r: 255, g: 119, b: 119, name: 'Light Red', hex: '#FF7777' },
      { index: 11, r: 51,  g: 51,  b: 51,  name: 'Dark Grey', hex: '#333333' },
      { index: 12, r: 119, g: 119, b: 119, name: 'Grey', hex: '#777777' },
      { index: 13, r: 170, g: 255, b: 102, name: 'Light Green', hex: '#AAFF66' },
      { index: 14, r: 0,   g: 136, b: 255, name: 'Light Blue', hex: '#0088FF' },
      { index: 15, r: 187, g: 187, b: 187, name: 'Light Grey', hex: '#BBBBBB' },
    ],
  },
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk Neon',
    description: 'High-contrast electric magenta, cyan, deep purples, and lasers',
    colors: [
      { index: 0,  r: 10,  g: 8,   b: 24,  name: 'Void Navy', hex: '#0A0818' },
      { index: 1,  r: 18,  g: 22,  b: 62,  name: 'Deep Abyss', hex: '#12163E' },
      { index: 2,  r: 58,  g: 12,  b: 84,  name: 'Neon Violet', hex: '#3A0C54' },
      { index: 3,  r: 138, g: 14,  b: 104, name: 'Hot Plum', hex: '#8A0E68' },
      { index: 4,  r: 224, g: 24,  b: 120, name: 'Laser Magenta', hex: '#E01878' },
      { index: 5,  r: 255, g: 78,  b: 168, name: 'Hot Pink', hex: '#FF4EA8' },
      { index: 6,  r: 16,  g: 64,  b: 92,  name: 'Dark Teal', hex: '#10405C' },
      { index: 7,  r: 0,   g: 140, b: 170, name: 'Electric Cyan', hex: '#008CAA' },
      { index: 8,  r: 0,   g: 224, b: 236, name: 'Neon Aqua', hex: '#00E0EC' },
      { index: 9,  r: 96,  g: 255, b: 240, name: 'Bright Mint', hex: '#60FFF0' },
      { index: 10, r: 24,  g: 180, b: 90,  name: 'Matrix Green', hex: '#18B45A' },
      { index: 11, r: 220, g: 255, b: 40,  name: 'Toxic Lime', hex: '#DCFF28' },
      { index: 12, r: 255, g: 140, b: 20,  name: 'Plasma Orange', hex: '#FF8C14' },
      { index: 13, r: 255, g: 220, b: 64,  name: 'Electric Yellow', hex: '#FFDC40' },
      { index: 14, r: 180, g: 190, b: 240, name: 'Synth Ice', hex: '#B4BEF0' },
      { index: 15, r: 255, g: 255, b: 255, name: 'Pure White', hex: '#FFFFFF' },
    ],
  },
  {
    id: 'sierra_fantasy',
    name: 'Sierra Quest (Fantasy)',
    description: 'Rich organic stone, royal gold, foliage, and twilight blues',
    colors: [
      { index: 0,  r: 12,  g: 14,  b: 18,  name: 'Abyssal Black', hex: '#0C0E12' },
      { index: 1,  r: 28,  g: 36,  b: 54,  name: 'Midnight Slate', hex: '#1C2436' },
      { index: 2,  r: 44,  g: 64,  b: 96,  name: 'Dusk Cobalt', hex: '#2C4060' },
      { index: 3,  r: 72,  g: 104, b: 144, name: 'Royal Steel', hex: '#486890' },
      { index: 4,  r: 28,  g: 54,  b: 36,  name: 'Dark Forest', hex: '#1C3624' },
      { index: 5,  r: 52,  g: 94,  b: 58,  name: 'Castle Moss', hex: '#345E3A' },
      { index: 6,  r: 96,  g: 144, b: 84,  name: 'Valley Sage', hex: '#609054' },
      { index: 7,  r: 160, g: 196, b: 120, name: 'Meadow Light', hex: '#A0C478' },
      { index: 8,  r: 64,  g: 40,  b: 28,  name: 'Ancient Bark', hex: '#40281C' },
      { index: 9,  r: 112, g: 68,  b: 44,  name: 'Fortress Timber', hex: '#70442C' },
      { index: 10, r: 168, g: 108, b: 64,  name: 'Clay Earth', hex: '#A86C40' },
      { index: 11, r: 216, g: 156, b: 88,  name: 'Crown Gold', hex: '#D89C58' },
      { index: 12, r: 248, g: 212, b: 136, name: 'Torchlight', hex: '#F8D488' },
      { index: 13, r: 140, g: 40,  b: 52,  name: 'Crimson Velvet', hex: '#8C2834' },
      { index: 14, r: 196, g: 80,  b: 92,  name: 'Rose Shield', hex: '#C4505C' },
      { index: 15, r: 248, g: 244, b: 236, name: 'Parchment White', hex: '#F8F4EC' },
    ],
  },
  {
    id: 'amber_phosphor',
    name: 'Amber Monochrome CRT',
    description: '16 shades of warm glowing amber phosphor CRT display',
    colors: Array.from({ length: 16 }, (_, i) => {
      const step = i / 15;
      const r = Math.round(step * 255);
      const g = Math.round(step * 170);
      const b = Math.round(step * 30);
      return {
        index: i,
        r,
        g,
        b,
        name: `Amber Tone ${i}`,
        hex: rgbToHex(r, g, b),
      };
    }),
  },
  {
    id: 'green_matrix',
    name: 'Green Terminal CRT',
    description: '16 shades of vintage P1 green phosphor terminal',
    colors: Array.from({ length: 16 }, (_, i) => {
      const step = i / 15;
      const r = Math.round(step * 40);
      const g = Math.round(step * 255);
      const b = Math.round(step * 60);
      return {
        index: i,
        r,
        g,
        b,
        name: `Green Tone ${i}`,
        hex: rgbToHex(r, g, b),
      };
    }),
  },
];

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
