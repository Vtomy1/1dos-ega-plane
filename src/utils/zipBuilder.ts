/**
 * Lightweight, zero-dependency client-side ZIP archive creator (Store format)
 * Generates standards-compliant .ZIP files compatible with Windows, macOS, Linux, and DOS PKUNZIP.
 */

export interface ZipEntry {
  filename: string;
  data: Uint8Array | string;
}

// Precomputed CRC32 table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c;
}

function computeCrc32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

export function createZipArchive(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder();
  const fileRecords: {
    filenameBytes: Uint8Array;
    dataBytes: Uint8Array;
    crc: number;
    offset: number;
  }[] = [];

  let currentOffset = 0;
  const parts: Uint8Array[] = [];

  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  // 1. Write Local File Headers and Data
  for (const entry of entries) {
    const filenameBytes = encoder.encode(entry.filename);
    const dataBytes = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
    const crc = computeCrc32(dataBytes);

    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const lv = new DataView(localHeader.buffer);

    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true);         // Version needed: 2.0
    lv.setUint16(6, 0, true);          // General purpose bit flag
    lv.setUint16(8, 0, true);          // Compression method: 0 (Stored)
    lv.setUint16(10, dosTime, true);   // Last mod file time
    lv.setUint16(12, dosDate, true);   // Last mod file date
    lv.setUint32(14, crc, true);       // CRC-32
    lv.setUint32(18, dataBytes.length, true); // Compressed size
    lv.setUint32(22, dataBytes.length, true); // Uncompressed size
    lv.setUint16(26, filenameBytes.length, true); // Filename length
    lv.setUint16(28, 0, true);         // Extra field length
    localHeader.set(filenameBytes, 30);

    fileRecords.push({
      filenameBytes,
      dataBytes,
      crc,
      offset: currentOffset,
    });

    parts.push(localHeader);
    parts.push(dataBytes);

    currentOffset += localHeader.length + dataBytes.length;
  }

  const centralDirectoryOffset = currentOffset;
  let centralDirectorySize = 0;

  // 2. Write Central Directory Headers
  for (const rec of fileRecords) {
    const cdHeader = new Uint8Array(46 + rec.filenameBytes.length);
    const cv = new DataView(cdHeader.buffer);

    cv.setUint32(0, 0x02014b50, true); // Central directory header signature
    cv.setUint16(4, 20, true);         // Version made by (DOS 2.0)
    cv.setUint16(6, 20, true);         // Version needed to extract
    cv.setUint16(8, 0, true);          // General purpose bit flag
    cv.setUint16(10, 0, true);         // Compression method: 0 (Stored)
    cv.setUint16(12, dosTime, true);   // Last mod file time
    cv.setUint16(14, dosDate, true);   // Last mod file date
    cv.setUint32(16, rec.crc, true);   // CRC-32
    cv.setUint32(20, rec.dataBytes.length, true); // Compressed size
    cv.setUint32(24, rec.dataBytes.length, true); // Uncompressed size
    cv.setUint16(28, rec.filenameBytes.length, true); // Filename length
    cv.setUint16(30, 0, true);         // Extra field length
    cv.setUint16(32, 0, true);         // File comment length
    cv.setUint16(34, 0, true);         // Disk number start
    cv.setUint16(36, 0, true);         // Internal file attributes
    cv.setUint32(38, 0, true);         // External file attributes
    cv.setUint32(42, rec.offset, true); // Relative offset of local header
    cdHeader.set(rec.filenameBytes, 46);

    parts.push(cdHeader);
    currentOffset += cdHeader.length;
    centralDirectorySize += cdHeader.length;
  }

  // 3. Write End of Central Directory Record (EOCD)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);

  ev.setUint32(0, 0x06054b50, true);              // EOCD signature
  ev.setUint16(4, 0, true);                       // Number of this disk
  ev.setUint16(6, 0, true);                       // Disk where central directory starts
  ev.setUint16(8, fileRecords.length, true);      // Number of central directory records on this disk
  ev.setUint16(10, fileRecords.length, true);     // Total number of central directory records
  ev.setUint32(12, centralDirectorySize, true);   // Size of central directory
  ev.setUint32(16, centralDirectoryOffset, true); // Offset of start of central directory
  ev.setUint16(20, 0, true);                      // Comment length

  parts.push(eocd);

  // Combine into single Uint8Array
  const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
  const zipBuffer = new Uint8Array(totalLength);
  let pos = 0;
  for (const part of parts) {
    zipBuffer.set(part, pos);
    pos += part.length;
  }

  return zipBuffer;
}
