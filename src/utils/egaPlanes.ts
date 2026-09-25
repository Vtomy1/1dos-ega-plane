/**
 * EGA 4-Plane Memory Converter for MS-DOS & QBasic SCREEN 7
 * 
 * In EGA 320x200 16-color graphics (QBasic SCREEN 7 / Mode 0Dh):
 * - Each scanline has 320 pixels.
 * - 8 pixels are packed per byte (320 / 8 = 40 bytes per scanline).
 * - 200 scanlines * 40 bytes = 8,000 bytes per plane.
 * - 4 Bitplanes:
 *     Plane 0: Blue component     (bit 0 of color index)
 *     Plane 1: Green component    (bit 1 of color index)
 *     Plane 2: Red component      (bit 2 of color index)
 *     Plane 3: Intensity component(bit 3 of color index)
 * - Total file size: 8,000 bytes * 4 planes = 32,000 bytes.
 */

export interface EgaPlanesData {
  plane0: Uint8Array; // 8,000 bytes (Blue)
  plane1: Uint8Array; // 8,000 bytes (Green)
  plane2: Uint8Array; // 8,000 bytes (Red)
  plane3: Uint8Array; // 8,000 bytes (Intensity)
  combined: Uint8Array; // 32,000 bytes (Plane 0 + Plane 1 + Plane 2 + Plane 3)
}

/**
 * Converts 320x200 16-color pixel indices into EGA 4-Plane bitmapped buffers
 */
export function encodeEga4Planes(colorIndices: Uint8Array, width: number = 320, height: number = 200): EgaPlanesData {
  const bytesPerScanline = Math.floor(width / 8); // 40 bytes
  const bytesPerPlane = bytesPerScanline * height; // 8,000 bytes
  
  const plane0 = new Uint8Array(bytesPerPlane);
  const plane1 = new Uint8Array(bytesPerPlane);
  const plane2 = new Uint8Array(bytesPerPlane);
  const plane3 = new Uint8Array(bytesPerPlane);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * bytesPerScanline;
    const pixelRowOffset = y * width;

    for (let byteCol = 0; byteCol < bytesPerScanline; byteCol++) {
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;

      // Pack 8 horizontal pixels into 1 byte per plane
      for (let bit = 0; bit < 8; bit++) {
        const px = byteCol * 8 + bit;
        const colorIdx = colorIndices[pixelRowOffset + px] & 0x0F;
        const bitShift = 7 - bit; // Bit 7 is leftmost pixel, Bit 0 is rightmost

        if ((colorIdx & 0x01) !== 0) b0 |= (1 << bitShift);
        if ((colorIdx & 0x02) !== 0) b1 |= (1 << bitShift);
        if ((colorIdx & 0x04) !== 0) b2 |= (1 << bitShift);
        if ((colorIdx & 0x08) !== 0) b3 |= (1 << bitShift);
      }

      const byteIdx = rowOffset + byteCol;
      plane0[byteIdx] = b0;
      plane1[byteIdx] = b1;
      plane2[byteIdx] = b2;
      plane3[byteIdx] = b3;
    }
  }

  // Combined 32,000 byte binary (sequential plane layout)
  const combined = new Uint8Array(bytesPerPlane * 4);
  combined.set(plane0, 0);
  combined.set(plane1, bytesPerPlane);
  combined.set(plane2, bytesPerPlane * 2);
  combined.set(plane3, bytesPerPlane * 3);

  return {
    plane0,
    plane1,
    plane2,
    plane3,
    combined,
  };
}

/**
 * Decodes EGA 4-plane buffer (32,000 bytes) back into 320x200 pixel color indices
 */
export function decodeEga4Planes(combined: Uint8Array, width: number = 320, height: number = 200): Uint8Array {
  const bytesPerScanline = Math.floor(width / 8);
  const bytesPerPlane = bytesPerScanline * height;
  const colorIndices = new Uint8Array(width * height);

  const plane0 = combined.subarray(0, bytesPerPlane);
  const plane1 = combined.subarray(bytesPerPlane, bytesPerPlane * 2);
  const plane2 = combined.subarray(bytesPerPlane * 2, bytesPerPlane * 3);
  const plane3 = combined.subarray(bytesPerPlane * 3, bytesPerPlane * 4);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * bytesPerScanline;
    const pixelRowOffset = y * width;

    for (let byteCol = 0; byteCol < bytesPerScanline; byteCol++) {
      const byteIdx = rowOffset + byteCol;
      const b0 = plane0[byteIdx];
      const b1 = plane1[byteIdx];
      const b2 = plane2[byteIdx];
      const b3 = plane3[byteIdx];

      for (let bit = 0; bit < 8; bit++) {
        const bitShift = 7 - bit;
        const bit0 = (b0 >> bitShift) & 1;
        const bit1 = (b1 >> bitShift) & 1;
        const bit2 = (b2 >> bitShift) & 1;
        const bit3 = (b3 >> bitShift) & 1;

        const color = bit0 | (bit1 << 1) | (bit2 << 2) | (bit3 << 3);
        colorIndices[pixelRowOffset + byteCol * 8 + bit] = color;
      }
    }
  }

  return colorIndices;
}

/**
 * Creates authentic MS-DOS QBasic BSAVE binary file (.BSV)
 * Format:
 * Offset 0: 0xFD (Magic byte indicating BSAVE format)
 * Offset 1-2: Segment address (0xA000 -> 0x00, 0xA0 in Little Endian)
 * Offset 3-4: Offset address (0x0000 -> 0x00, 0x00)
 * Offset 5-6: Data length in bytes (32,000 -> 0x00, 0x7D)
 * Followed by raw data.
 */
export function createQBasicBsaveBuffer(data: Uint8Array, segment: number = 0xA000, offset: number = 0x0000): Uint8Array {
  const bsv = new Uint8Array(7 + data.length);
  bsv[0] = 0xFD; // BSAVE identifier
  bsv[1] = offset & 0xFF;
  bsv[2] = (offset >> 8) & 0xFF;
  bsv[3] = segment & 0xFF;
  bsv[4] = (segment >> 8) & 0xFF;
  const len = data.length;
  bsv[5] = len & 0xFF;
  bsv[6] = (len >> 8) & 0xFF;
  bsv.set(data, 7);
  return bsv;
}
