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

export interface CategorizedPreset {
  id: string;
  name: string;
  category: 'EGA' | 'CGA' | 'VGA' | 'Hercules' | 'Custom';
  description: string;
  colors: RgbColor[];
}

export const CATEGORIZED_PALETTES: CategorizedPreset[] = [
  // --- EGA (Enhanced Graphics Adapter) ---
  {
    id: 'ega_standard',
    name: 'IBM EGA Standard (1984)',
    category: 'EGA',
    description: 'Factory 16-color hardware default for SCREEN 7 / Mode 0Dh',
    colors: EGA_16_PALETTE,
  },
  {
    id: 'ega_c64',
    name: 'Commodore 64 (VIC-II)',
    category: 'EGA',
    description: 'Muted, warm earthy tones from the legendary 8-bit computer',
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
    id: 'ega_cyberpunk',
    name: 'Cyberpunk Neon 16',
    category: 'EGA',
    description: 'Electric magenta, vivid cyan, deep violet, and synthwave lasers',
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
    id: 'ega_sierra',
    name: 'Sierra Quest (Fantasy)',
    category: 'EGA',
    description: 'Castle stonework, rich forest foliage, torchlight, and royal velvet',
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

  // --- CGA (Color Graphics Adapter) ---
  {
    id: 'cga_mode4_pal1_hi',
    name: 'CGA Mode 4 Pal 1 (High Intensity)',
    category: 'CGA',
    description: 'Iconic 1981 DOS palette: Black, Cyan, Magenta, White',
    colors: [
      { index: 0,  r: 0,   g: 0,   b: 0,   name: 'Black', hex: '#000000' },
      { index: 1,  r: 85,  g: 255, b: 255, name: 'Bright Cyan', hex: '#55FFFF' },
      { index: 2,  r: 255, g: 85,  b: 255, name: 'Bright Magenta', hex: '#FF55FF' },
      { index: 3,  r: 255, g: 255, b: 255, name: 'Bright White', hex: '#FFFFFF' },
      // Extended shades for 16-color dithering compatibility
      { index: 4,  r: 0,   g: 0,   b: 0,   name: 'Black (Dither)', hex: '#000000' },
      { index: 5,  r: 0,   g: 170, b: 170, name: 'Dark Cyan', hex: '#00AAAA' },
      { index: 6,  r: 170, g: 0,   b: 170, name: 'Dark Magenta', hex: '#AA00AA' },
      { index: 7,  r: 170, g: 170, b: 170, name: 'Light Gray', hex: '#AAAAAA' },
      { index: 8,  r: 0,   g: 85,  b: 85,  name: 'Deep Cyan', hex: '#005555' },
      { index: 9,  r: 85,  g: 0,   b: 85,  name: 'Deep Magenta', hex: '#550055' },
      { index: 10, r: 40,  g: 180, b: 180, name: 'Mid Cyan', hex: '#28B4B4' },
      { index: 11, r: 180, g: 40,  b: 180, name: 'Mid Magenta', hex: '#B428B4' },
      { index: 12, r: 120, g: 255, b: 255, name: 'Pastel Cyan', hex: '#78FFFF' },
      { index: 13, r: 255, g: 120, b: 255, name: 'Pastel Magenta', hex: '#FF78FF' },
      { index: 14, r: 220, g: 220, b: 220, name: 'Near White', hex: '#DCDCDC' },
      { index: 15, r: 255, g: 255, b: 255, name: 'Pure White', hex: '#FFFFFF' },
    ],
  },
  {
    id: 'cga_mode4_pal0_hi',
    name: 'CGA Mode 4 Pal 0 (High Intensity)',
    category: 'CGA',
    description: 'Green, Red, Yellow and Black (Classic DOS gaming)',
    colors: [
      { index: 0,  r: 0,   g: 0,   b: 0,   name: 'Black', hex: '#000000' },
      { index: 1,  r: 85,  g: 255, b: 85,  name: 'Bright Green', hex: '#55FF55' },
      { index: 2,  r: 255, g: 85,  b: 85,  name: 'Bright Red', hex: '#FF5555' },
      { index: 3,  r: 255, g: 255, b: 85,  name: 'Yellow', hex: '#FFFF55' },
      { index: 4,  r: 0,   g: 170, b: 0,   name: 'Dark Green', hex: '#00AA00' },
      { index: 5,  r: 170, g: 0,   b: 0,   name: 'Dark Red', hex: '#AA0000' },
      { index: 6,  r: 170, g: 85,  b: 0,   name: 'Brown', hex: '#AA5500' },
      { index: 7,  r: 85,  g: 85,  b: 85,  name: 'Dark Gray', hex: '#555555' },
      { index: 8,  r: 0,   g: 60,  b: 0,   name: 'Deep Forest', hex: '#003C00' },
      { index: 9,  r: 80,  g: 0,   b: 0,   name: 'Deep Crimson', hex: '#500000' },
      { index: 10, r: 120, g: 60,  b: 0,   name: 'Earth Amber', hex: '#783C00' },
      { index: 11, r: 180, g: 255, b: 120, name: 'Light Lime', hex: '#B4FF78' },
      { index: 12, r: 255, g: 150, b: 100, name: 'Coral', hex: '#FF9664' },
      { index: 13, r: 255, g: 255, b: 160, name: 'Pale Yellow', hex: '#FFFFA0' },
      { index: 14, r: 180, g: 180, b: 180, name: 'Slate Gray', hex: '#B4B4B4' },
      { index: 15, r: 255, g: 255, b: 255, name: 'White', hex: '#FFFFFF' },
    ],
  },
  {
    id: 'cga_composite',
    name: 'CGA 16 Composite Artifact',
    category: 'CGA',
    description: 'Simulated NTSC color bursts from composite monitors (King’s Quest / Ultima)',
    colors: [
      { index: 0,  r: 0,   g: 0,   b: 0,   name: 'Black', hex: '#000000' },
      { index: 1,  r: 0,   g: 68,  b: 28,  name: 'Dark Green', hex: '#00441C' },
      { index: 2,  r: 44,  g: 44,  b: 148, name: 'Navy Blue', hex: '#2C2C94' },
      { index: 3,  r: 20,  g: 112, b: 176, name: 'Steel Blue', hex: '#1470B0' },
      { index: 4,  r: 124, g: 28,  b: 0,   name: 'Dark Brick', hex: '#7C1C00' },
      { index: 5,  r: 116, g: 104, b: 12,  name: 'Olive', hex: '#74680C' },
      { index: 6,  r: 172, g: 68,  b: 152, name: 'Dusty Violet', hex: '#AC4498' },
      { index: 7,  r: 148, g: 148, b: 255, name: 'Periwinkle', hex: '#9494FF' },
      { index: 8,  r: 68,  g: 80,  b: 0,   name: 'Army Green', hex: '#445000' },
      { index: 9,  r: 36,  g: 168, b: 52,  name: 'Bright Emerald', hex: '#24A834' },
      { index: 10, r: 120, g: 136, b: 248, name: 'Sky Violet', hex: '#7888F8' },
      { index: 11, r: 100, g: 204, b: 255, name: 'Light Cyan', hex: '#64CCFF' },
      { index: 12, r: 216, g: 92,  b: 0,   name: 'Tangerine', hex: '#D85C00' },
      { index: 13, r: 204, g: 188, b: 0,   name: 'Gold', hex: '#CCBC00' },
      { index: 14, r: 255, g: 144, b: 228, name: 'Light Orchid', hex: '#FF90E4' },
      { index: 15, r: 255, g: 255, b: 255, name: 'White', hex: '#FFFFFF' },
    ],
  },

  // --- VGA (Video Graphics Array) ---
  {
    id: 'vga_default_16',
    name: 'IBM VGA Default 16 (1987)',
    category: 'VGA',
    description: 'Standard 6-bit DAC VGA register defaults with authentic brown & slate',
    colors: [
      { index: 0,  r: 0,   g: 0,   b: 0,   name: 'Black', hex: '#000000' },
      { index: 1,  r: 0,   g: 0,   b: 168, name: 'Blue', hex: '#0000A8' },
      { index: 2,  r: 0,   g: 168, b: 0,   name: 'Green', hex: '#00A800' },
      { index: 3,  r: 0,   g: 168, b: 168, name: 'Cyan', hex: '#00A8A8' },
      { index: 4,  r: 168, g: 0,   b: 0,   name: 'Red', hex: '#A80000' },
      { index: 5,  r: 168, g: 0,   b: 168, name: 'Magenta', hex: '#A800A8' },
      { index: 6,  r: 168, g: 84,  b: 0,   name: 'Brown', hex: '#A85400' },
      { index: 7,  r: 168, g: 168, b: 168, name: 'Light Gray', hex: '#A8A8A8' },
      { index: 8,  r: 84,  g: 84,  b: 84,  name: 'Dark Gray', hex: '#545454' },
      { index: 9,  r: 84,  g: 84,  b: 252, name: 'Light Blue', hex: '#5454FC' },
      { index: 10, r: 84,  g: 252, b: 84,  name: 'Light Green', hex: '#54FC54' },
      { index: 11, r: 84,  g: 252, b: 252, name: 'Light Cyan', hex: '#54FCFC' },
      { index: 12, r: 252, g: 84,  b: 84,  name: 'Light Red', hex: '#FC5454' },
      { index: 13, r: 252, g: 84,  b: 252, name: 'Light Magenta', hex: '#FC54FC' },
      { index: 14, r: 252, g: 252, b: 84,  name: 'Yellow', hex: '#FCFC54' },
      { index: 15, r: 252, g: 252, b: 252, name: 'Bright White', hex: '#FCFCFC' },
    ],
  },
  {
    id: 'vga_fire_ramp',
    name: 'VGA Fire & Magma Ramp',
    category: 'VGA',
    description: 'Black to crimson, orange, yellow, and incandescent white flame',
    colors: [
      { index: 0,  r: 0,   g: 0,   b: 0,   name: 'Void Black', hex: '#000000' },
      { index: 1,  r: 32,  g: 0,   b: 0,   name: 'Charcoal Red', hex: '#200000' },
      { index: 2,  r: 64,  g: 0,   b: 0,   name: 'Deep Ember', hex: '#400000' },
      { index: 3,  r: 96,  g: 0,   b: 0,   name: 'Dark Crimson', hex: '#600000' },
      { index: 4,  r: 136, g: 12,  b: 0,   name: 'Ruby Heat', hex: '#880C00' },
      { index: 5,  r: 176, g: 24,  b: 0,   name: 'Flame Red', hex: '#B01800' },
      { index: 6,  r: 216, g: 48,  b: 0,   name: 'Blaze Orange', hex: '#D83000' },
      { index: 7,  r: 248, g: 80,  b: 0,   name: 'Magma Orange', hex: '#F85000' },
      { index: 8,  r: 255, g: 120, b: 0,   name: 'Bright Amber', hex: '#FF7800' },
      { index: 9,  r: 255, g: 160, b: 0,   name: 'Golden Sun', hex: '#FFA000' },
      { index: 10, r: 255, g: 196, b: 16,  name: 'Solar Yellow', hex: '#FFC410' },
      { index: 11, r: 255, g: 224, b: 48,  name: 'Laser Yellow', hex: '#FFE030' },
      { index: 12, r: 255, g: 244, b: 96,  name: 'White Gold', hex: '#FFF460' },
      { index: 13, r: 255, g: 255, b: 160, name: 'Plasma Glow', hex: '#FFFFA0' },
      { index: 14, r: 255, g: 255, b: 220, name: 'Corona White', hex: '#FFFFDC' },
      { index: 15, r: 255, g: 255, b: 255, name: 'Pure Heat', hex: '#FFFFFF' },
    ],
  },

  // --- Hercules (Monochrome / MDA) ---
  {
    id: 'hercules_amber',
    name: 'Hercules Amber Phosphor',
    category: 'Hercules',
    description: '16 shades of warm vintage amber CRT glow (720x348 HGC display)',
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
    id: 'hercules_green',
    name: 'Hercules P1 Green Phosphor',
    category: 'Hercules',
    description: '16 shades of authentic IBM 5151 monochrome green display',
    colors: Array.from({ length: 16 }, (_, i) => {
      const step = i / 15;
      const r = Math.round(step * 36);
      const g = Math.round(step * 255);
      const b = Math.round(step * 54);
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
  {
    id: 'hercules_paperwhite',
    name: 'Hercules Paper White Monochrome',
    category: 'Hercules',
    description: 'High-contrast paper-white CRT phosphor grayscale',
    colors: Array.from({ length: 16 }, (_, i) => {
      const val = Math.round((i / 15) * 255);
      return {
        index: i,
        r: val,
        g: val,
        b: val,
        name: `Paper White ${i}`,
        hex: rgbToHex(val, val, val),
      };
    }),
  },
];

// Compatibility alias
export const RETRO_16_PRESETS = CATEGORIZED_PALETTES;

// --- LocalStorage Custom Palettes Support ---
const STORAGE_KEY = 'dos_custom_user_palettes';

export function loadUserCustomPalettes(): CategorizedPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((p: any) => ({
        id: p.id || `custom_${Date.now()}_${Math.random()}`,
        name: p.name || 'Untitled Custom Palette',
        category: 'Custom' as const,
        description: p.description || 'User-saved custom palette',
        colors: p.colors || [],
      }));
    }
  } catch (e) {
    console.error('Failed to load user custom palettes', e);
  }
  return [];
}

export function saveUserCustomPalette(name: string, colors: RgbColor[]): CategorizedPreset {
  const existing = loadUserCustomPalettes();
  const id = `custom_${Date.now()}`;
  const newPalette: CategorizedPreset = {
    id,
    name: name.trim() || `Custom Palette ${existing.length + 1}`,
    category: 'Custom',
    description: `User-created palette saved on ${new Date().toLocaleDateString()}`,
    colors: clonePalette(colors),
  };
  const updated = [newPalette, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save palette to localStorage', e);
  }
  return newPalette;
}

export function deleteUserCustomPalette(id: string): CategorizedPreset[] {
  const existing = loadUserCustomPalettes();
  const filtered = existing.filter((p) => p.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete custom palette', e);
  }
  return filtered;
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
