import { AspectRatioMode, DitherAlgorithm, GraphicMode, RgbColor } from '../types/dos';
import { CGA_4_PALETTE, EGA_16_PALETTE, findNearestColorIndex, getStandardVga256Palette } from './palettes';

export interface ImageProcessingOptions {
  mode: GraphicMode;
  dither: DitherAlgorithm;
  strength: number; // 0.0 to 1.0
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  gamma: number; // 0.5 to 2.5
  aspectMode: AspectRatioMode;
  targetWidth?: number; // default 320
  targetHeight?: number; // default 200
  serpentine?: boolean;
  customPalette?: RgbColor[];
}

// 4x4 Bayer Matrix
const BAYER_4X4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5]
];

// 8x8 Bayer Matrix
const BAYER_8X8 = [
  [ 0, 32,  8, 40,  2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44,  4, 36, 14, 46,  6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [ 3, 35, 11, 43,  1, 33,  9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47,  7, 39, 13, 45,  5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21]
];

export function getPaletteForMode(mode: GraphicMode): RgbColor[] {
  switch (mode) {
    case 'ega_screen7':
    case 'ega_screen9':
      return EGA_16_PALETTE;
    case 'cga_mode4':
      return CGA_4_PALETTE;
    case 'vga_mode13h':
    default:
      return getStandardVga256Palette();
  }
}

/**
 * Resamples source canvas / image to the target 320x200 resolution based on aspect ratio mode
 */
export function resampleToTarget(
  sourceImage: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  aspectMode: AspectRatioMode
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get 2D canvas context');

  // Fill background with black for letterbox
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Turn on pixelated smoothing for clean retro downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (aspectMode === 'stretch_320x200') {
    ctx.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);
  } else if (aspectMode === 'fit_letterbox') {
    const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const renderW = Math.round(sourceWidth * scale);
    const renderH = Math.round(sourceHeight * scale);
    const offsetX = Math.floor((targetWidth - renderW) / 2);
    const offsetY = Math.floor((targetHeight - renderH) / 2);
    ctx.drawImage(sourceImage, offsetX, offsetY, renderW, renderH);
  } else if (aspectMode === 'crop_fill') {
    const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const renderW = Math.round(sourceWidth * scale);
    const renderH = Math.round(sourceHeight * scale);
    const offsetX = Math.floor((targetWidth - renderW) / 2);
    const offsetY = Math.floor((targetHeight - renderH) / 2);
    ctx.drawImage(sourceImage, offsetX, offsetY, renderW, renderH);
  }

  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}

/**
 * Applies color corrections (brightness, contrast, gamma)
 */
function applyAdjustments(
  r: number,
  g: number,
  b: number,
  brightness: number,
  contrast: number,
  gamma: number
): [number, number, number] {
  // Brightness: -100 to 100
  let adjR = r + (brightness * 255) / 100;
  let adjG = g + (brightness * 255) / 100;
  let adjB = b + (brightness * 255) / 100;

  // Contrast: -100 to 100
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  adjR = factor * (adjR - 128) + 128;
  adjG = factor * (adjG - 128) + 128;
  adjB = factor * (adjB - 128) + 128;

  // Gamma: 0.5 to 2.5
  if (gamma !== 1.0) {
    const invGamma = 1.0 / gamma;
    adjR = 255 * Math.pow(Math.max(0, adjR) / 255, invGamma);
    adjG = 255 * Math.pow(Math.max(0, adjG) / 255, invGamma);
    adjB = 255 * Math.pow(Math.max(0, adjB) / 255, invGamma);
  }

  return [
    Math.min(255, Math.max(0, adjR)),
    Math.min(255, Math.max(0, adjG)),
    Math.min(255, Math.max(0, adjB)),
  ];
}

/**
 * Full Dithering and Quantization Pipeline
 */
export function quantizeAndDither(
  imageData: ImageData,
  options: ImageProcessingOptions
): {
  colorIndices: Uint8Array;
  rgbPixels: Uint8ClampedArray;
  palette: RgbColor[];
} {
  const { width, height, data } = imageData;
  const palette = options.customPalette && options.customPalette.length > 0
    ? options.customPalette
    : getPaletteForMode(options.mode);
  const colorIndices = new Uint8Array(width * height);
  const rgbPixels = new Uint8ClampedArray(width * height * 4);
  const strength = options.strength;
  const serpentine = options.serpentine ?? true;

  // Working float buffers for RGB to diffuse error accurately
  const rBuf = new Float32Array(width * height);
  const gBuf = new Float32Array(width * height);
  const bBuf = new Float32Array(width * height);

  // Initialize with preprocessed pixels
  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * 4;
    const [r, g, b] = applyAdjustments(
      data[srcIdx],
      data[srcIdx + 1],
      data[srcIdx + 2],
      options.brightness,
      options.contrast,
      options.gamma
    );
    rBuf[i] = r;
    gBuf[i] = g;
    bBuf[i] = b;
  }

  // Helper to add error to a neighbor
  const addError = (x: number, y: number, er: number, eg: number, eb: number, weight: number) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    rBuf[idx] += er * weight * strength;
    gBuf[idx] += eg * weight * strength;
    bBuf[idx] += eb * weight * strength;
  };

  // Process rows
  for (let y = 0; y < height; y++) {
    const isReverse = serpentine && (y % 2 === 1);
    const startX = isReverse ? width - 1 : 0;
    const endX = isReverse ? -1 : width;
    const stepX = isReverse ? -1 : 1;

    for (let x = startX; x !== endX; x += stepX) {
      const idx = y * width + x;
      let curR = Math.min(255, Math.max(0, rBuf[idx]));
      let curG = Math.min(255, Math.max(0, gBuf[idx]));
      let curB = Math.min(255, Math.max(0, bBuf[idx]));

      // Ordered Dithering adjustments before nearest search
      if (options.dither === 'bayer_4x4') {
        const threshold = (BAYER_4X4[y % 4][x % 4] / 16 - 0.5) * 64 * strength;
        curR = Math.min(255, Math.max(0, curR + threshold));
        curG = Math.min(255, Math.max(0, curG + threshold));
        curB = Math.min(255, Math.max(0, curB + threshold));
      } else if (options.dither === 'bayer_8x8') {
        const threshold = (BAYER_8X8[y % 8][x % 8] / 64 - 0.5) * 64 * strength;
        curR = Math.min(255, Math.max(0, curR + threshold));
        curG = Math.min(255, Math.max(0, curG + threshold));
        curB = Math.min(255, Math.max(0, curB + threshold));
      }

      // Find nearest color in palette
      const colorIndex = findNearestColorIndex(curR, curG, curB, palette);
      const chosenColor = palette[colorIndex];
      colorIndices[idx] = colorIndex;

      // Fill output RGBA preview
      const outIdx = idx * 4;
      rgbPixels[outIdx] = chosenColor.r;
      rgbPixels[outIdx + 1] = chosenColor.g;
      rgbPixels[outIdx + 2] = chosenColor.b;
      rgbPixels[outIdx + 3] = 255;

      // If ordered dither or no dither, skip error diffusion
      if (options.dither === 'nearest' || options.dither === 'bayer_4x4' || options.dither === 'bayer_8x8') {
        continue;
      }

      // Calculate quantization error
      const errR = curR - chosenColor.r;
      const errG = curG - chosenColor.g;
      const errB = curB - chosenColor.b;

      // Error Diffusion Algorithms
      if (options.dither === 'floyd_steinberg') {
        // Floyd-Steinberg: 7/16, 3/16, 5/16, 1/16
        if (!isReverse) {
          addError(x + 1, y, errR, errG, errB, 7 / 16);
          addError(x - 1, y + 1, errR, errG, errB, 3 / 16);
          addError(x, y + 1, errR, errG, errB, 5 / 16);
          addError(x + 1, y + 1, errR, errG, errB, 1 / 16);
        } else {
          addError(x - 1, y, errR, errG, errB, 7 / 16);
          addError(x + 1, y + 1, errR, errG, errB, 3 / 16);
          addError(x, y + 1, errR, errG, errB, 5 / 16);
          addError(x - 1, y + 1, errR, errG, errB, 1 / 16);
        }
      } else if (options.dither === 'atkinson') {
        // Bill Atkinson algorithm (1/8 each to 6 neighbors)
        const w = 1 / 8;
        const dir = isReverse ? -1 : 1;
        addError(x + dir, y, errR, errG, errB, w);
        addError(x + 2 * dir, y, errR, errG, errB, w);
        addError(x - dir, y + 1, errR, errG, errB, w);
        addError(x, y + 1, errR, errG, errB, w);
        addError(x + dir, y + 1, errR, errG, errB, w);
        addError(x, y + 2, errR, errG, errB, w);
      } else if (options.dither === 'sierra_lite') {
        // Sierra Lite: 2/4 right, 1/4 down-left, 1/4 down
        const dir = isReverse ? -1 : 1;
        addError(x + dir, y, errR, errG, errB, 2 / 4);
        addError(x - dir, y + 1, errR, errG, errB, 1 / 4);
        addError(x, y + 1, errR, errG, errB, 1 / 4);
      } else if (options.dither === 'burkes') {
        // Burkes: 8/32 right, 4/32 right+2, etc.
        const dir = isReverse ? -1 : 1;
        addError(x + dir, y, errR, errG, errB, 8 / 32);
        addError(x + 2 * dir, y, errR, errG, errB, 4 / 32);
        addError(x - 2 * dir, y + 1, errR, errG, errB, 2 / 32);
        addError(x - dir, y + 1, errR, errG, errB, 4 / 32);
        addError(x, y + 1, errR, errG, errB, 8 / 32);
        addError(x + dir, y + 1, errR, errG, errB, 4 / 32);
        addError(x + 2 * dir, y + 1, errR, errG, errB, 2 / 32);
      }
    }
  }

  return {
    colorIndices,
    rgbPixels,
    palette,
  };
}
