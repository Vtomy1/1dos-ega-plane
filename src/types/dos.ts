export type GraphicMode = 'ega_screen7' | 'vga_mode13h' | 'cga_mode4' | 'ega_screen9';

export type DitherAlgorithm = 
  | 'floyd_steinberg'
  | 'atkinson'
  | 'bayer_4x4'
  | 'bayer_8x8'
  | 'sierra_lite'
  | 'burkes'
  | 'nearest';

export type AspectRatioMode = 'fit_letterbox' | 'crop_fill' | 'stretch_320x200';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  name?: string;
  hex?: string;
  index: number;
}

export interface DosExeHeader {
  signature: number;        // 0x5A4D ("MZ")
  lastPageBytes: number;    // e_cblp
  pagesInFile: number;      // e_cp (512-byte pages)
  relocationsCount: number; // e_crlc
  headerParagraphs: number; // e_cparhdr (16-byte units)
  minExtraParagraphs: number; // e_minalloc
  maxExtraParagraphs: number; // e_maxalloc (0xFFFF)
  initialSS: number;        // e_ss
  initialSP: number;        // e_sp
  checksum: number;         // e_csum
  initialIP: number;        // e_ip
  initialCS: number;        // e_cs
  relocTableOffset: number; // e_lfarlc (0x0040)
  overlayNumber: number;    // e_ovno (0)
}

export interface PixelInspection {
  x: number;
  y: number;
  colorIndex: number;
  rgb: [number, number, number];
  hex: string;
  egaPlanes?: {
    plane0_blue: number;
    plane1_green: number;
    plane2_red: number;
    plane3_intensity: number;
  };
}

export interface ConversionResult {
  width: number;
  height: number;
  mode: GraphicMode;
  dither: DitherAlgorithm;
  colorIndices: Uint8Array; // width * height
  rgbPixels: Uint8ClampedArray; // RGBA preview for canvas
  palette: RgbColor[];
  egaPlanes?: {
    plane0: Uint8Array; // 8000 bytes
    plane1: Uint8Array; // 8000 bytes
    plane2: Uint8Array; // 8000 bytes
    plane3: Uint8Array; // 8000 bytes
    combined: Uint8Array; // 32000 bytes (sequential plane 0,1,2,3)
  };
  exeBuffer: Uint8Array;
  comBuffer: Uint8Array;
  exeHeader: DosExeHeader;
  bsaveBuffer?: Uint8Array;
}
