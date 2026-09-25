import { DosExeHeader, GraphicMode } from '../types/dos';

export interface ExeBuildResult {
  exeBuffer: Uint8Array;
  comBuffer: Uint8Array;
  header: DosExeHeader;
  asmSource: string;
}

/**
 * Builds authentic MS-DOS MZ .EXE and .COM executables that display the image
 * in either VGA Mode 13h (8-bit 320x200 linear) or EGA Mode 0Dh (320x200 4-plane).
 */
export function buildDosExecutable(
  mode: GraphicMode,
  pixelData: Uint8Array, // either 64,000 bytes (VGA) or 32,000 bytes (EGA 4-plane)
  paletteRgb?: Array<[number, number, number]>
): ExeBuildResult {
  const isEga = mode === 'ega_screen7' || mode === 'ega_screen9';
  
  // 1. Generate x86 16-bit machine code loader
  const codeBytes: number[] = [];

  // PUSH CS; POP DS (Set DS = CS)
  codeBytes.push(0x0E, 0x1F);

  if (!isEga) {
    // === VGA MODE 13h (320x200 256 colors) ===
    // MOV AX, 0013h
    codeBytes.push(0xB8, 0x13, 0x00);
    // INT 10h
    codeBytes.push(0xCD, 0x10);

    // If custom palette provided, program DAC registers 03C8h / 03C9h
    let paletteOffset = 0;
    if (paletteRgb && paletteRgb.length > 0) {
      // MOV DX, 03C8h (DAC write index register)
      codeBytes.push(0xBA, 0xC8, 0x03);
      // XOR AL, AL (Start at color 0)
      codeBytes.push(0x30, 0xC0);
      // OUT DX, AL
      codeBytes.push(0xEF);
      // INC DX (03C9h - DAC data register)
      codeBytes.push(0x42);
      // MOV SI, offset palette_data (we'll patch offset later)
      const paletteSiPlaceholder = codeBytes.length + 1;
      codeBytes.push(0xBE, 0x00, 0x00);
      // MOV CX, count * 3
      const palBytesCount = Math.min(256, paletteRgb.length) * 3;
      codeBytes.push(0xB9, palBytesCount & 0xFF, (palBytesCount >> 8) & 0xFF);
      // CLD
      codeBytes.push(0xFC);
      // Palette copy loop: LODSB; OUT DX, AL; LOOP
      // loop_pal: LODSB (AC); OUT DX, AL (EE); LOOP loop_pal (E2 FB)
      codeBytes.push(0xAC, 0xEE, 0xE2, 0xFC);

      paletteOffset = paletteSiPlaceholder;
    }

    // Set ES to VGA segment 0A000h
    // MOV AX, 0A000h
    codeBytes.push(0xB8, 0x00, 0xA0);
    // MOV ES, AX
    codeBytes.push(0x8E, 0xC0);
    // XOR DI, DI (Destination offset 0000h)
    codeBytes.push(0x31, 0xFF);
    // MOV SI, offset image_data
    const imageSiPlaceholder = codeBytes.length + 1;
    codeBytes.push(0xBE, 0x00, 0x00);
    // MOV CX, 32000 words (64,000 bytes)
    codeBytes.push(0xB9, 0x40, 0x7D);
    // CLD
    codeBytes.push(0xFC);
    // REP MOVSW (Copy CX words from DS:SI to ES:DI)
    codeBytes.push(0xF3, 0xA5);

  } else {
    // === EGA MODE 0Dh (320x200 16 colors, 4 planes) ===
    // MOV AX, 000Dh
    codeBytes.push(0xB8, 0x0D, 0x00);
    // INT 10h
    codeBytes.push(0xCD, 0x10);

    // Set ES to EGA segment 0A000h
    // MOV AX, 0A000h
    codeBytes.push(0xB8, 0x00, 0xA0);
    // MOV ES, AX
    codeBytes.push(0x8E, 0xC0);

    // MOV SI, offset image_data (Plane 0)
    const imageSiPlaceholder = codeBytes.length + 1;
    codeBytes.push(0xBE, 0x00, 0x00);

    // Loop through 4 planes (Plane 0 to 3)
    // XOR BL, BL (Plane index = 0)
    codeBytes.push(0x30, 0xDB);

    // plane_loop:
    const planeLoopStart = codeBytes.length;

    // Calculate map mask: AL = 1 << BL
    // MOV AL, 01h
    codeBytes.push(0xB0, 0x01);
    // MOV CL, BL
    codeBytes.push(0x88, 0xD9);
    // SHL AL, CL
    codeBytes.push(0xD2, 0xE0);
    // MOV AH, AL (AH now has bitmask)
    codeBytes.push(0x88, 0xC4);

    // Program EGA Sequencer: Reg 02h (Map Mask Register)
    // MOV DX, 03C4h
    codeBytes.push(0xBA, 0xC4, 0x03);
    // MOV AL, 02h (Index 2: Map Mask)
    codeBytes.push(0xB0, 0x02);
    // OUT DX, AX (Outputs index 02h to 03C4h and bitmask to 03C5h!)
    codeBytes.push(0xEF);

    // Reset DI to 0000h
    codeBytes.push(0x31, 0xFF);
    // MOV CX, 4000 words (8,000 bytes per plane)
    codeBytes.push(0xB9, 0xA0, 0x0F);
    // CLD
    codeBytes.push(0xFC);
    // REP MOVSW
    codeBytes.push(0xF3, 0xA5);

    // INC BL
    codeBytes.push(0xFE, 0xC3);
    // CMP BL, 04h
    codeBytes.push(0x80, 0xFB, 0x04);
    // JB plane_loop
    const jumpOffset = planeLoopStart - (codeBytes.length + 2);
    codeBytes.push(0x72, jumpOffset & 0xFF);
  }

  // === WAIT FOR KEYPRESS ===
  // XOR AX, AX (AH = 0: Read key)
  codeBytes.push(0x31, 0xC0);
  // INT 16h
  codeBytes.push(0xCD, 0x16);

  // === RESTORE 80x25 TEXT MODE ===
  // MOV AX, 0003h
  codeBytes.push(0xB8, 0x03, 0x00);
  // INT 10h
  codeBytes.push(0xCD, 0x10);

  // === TERMINATE PROCESS TO DOS ===
  // MOV AX, 4C00h
  codeBytes.push(0xB8, 0x00, 0x4C);
  // INT 21h
  codeBytes.push(0xCD, 0x21);

  // Calculate offsets for data payload
  const codeLength = codeBytes.length;
  
  // Palette data (if present)
  let paletteDataBytes: number[] = [];
  if (!isEga && paletteRgb && paletteRgb.length > 0) {
    for (let i = 0; i < Math.min(256, paletteRgb.length); i++) {
      const [r, g, b] = paletteRgb[i];
      // VGA DAC uses 6-bit values (0-63)
      paletteDataBytes.push(Math.floor(r / 4), Math.floor(g / 4), Math.floor(b / 4));
    }
  }

  // Determine offsets in the image payload
  const imageOffsetInCodeSegment = codeLength + paletteDataBytes.length;

  // Patch the placeholder offsets in the machine code:
  // For MZ .EXE, code starts at offset 0 of CS.
  // For .COM file, code starts at CS:0100h.
  // Let's create proper patched byte arrays for both:

  // --- BUILD .COM (Flat 16-bit binary, starts at CS:0100h) ---
  const comBytes = new Uint8Array(0x100 + codeLength + paletteDataBytes.length + pixelData.length);
  const comCode = new Uint8Array(codeBytes);
  // Patch COM offsets:
  if (!isEga && paletteDataBytes.length > 0) {
    const comPalOffset = 0x100 + codeLength;
    comCode[14] = comPalOffset & 0xFF;
    comCode[15] = (comPalOffset >> 8) & 0xFF;
    
    const comImgOffset = 0x100 + imageOffsetInCodeSegment;
    comCode[29] = comImgOffset & 0xFF;
    comCode[30] = (comImgOffset >> 8) & 0xFF;
  } else if (!isEga) {
    const comImgOffset = 0x100 + imageOffsetInCodeSegment;
    comCode[14] = comImgOffset & 0xFF;
    comCode[15] = (comImgOffset >> 8) & 0xFF;
  } else {
    // EGA
    const comImgOffset = 0x100 + imageOffsetInCodeSegment;
    comCode[11] = comImgOffset & 0xFF;
    comCode[12] = (comImgOffset >> 8) & 0xFF;
  }
  
  // .COM payload
  const comPayload = new Uint8Array(codeLength + paletteDataBytes.length + pixelData.length);
  comPayload.set(comCode, 0);
  if (paletteDataBytes.length > 0) {
    comPayload.set(paletteDataBytes, codeLength);
  }
  comPayload.set(pixelData, imageOffsetInCodeSegment);

  // --- BUILD MZ .EXE (Authentic MS-DOS MZ Executable) ---
  const exeCode = new Uint8Array(codeBytes);
  // Patch EXE offsets (starts at CS:0000h):
  if (!isEga && paletteDataBytes.length > 0) {
    const exePalOffset = codeLength;
    exeCode[14] = exePalOffset & 0xFF;
    exeCode[15] = (exePalOffset >> 8) & 0xFF;
    
    const exeImgOffset = imageOffsetInCodeSegment;
    exeCode[29] = exeImgOffset & 0xFF;
    exeCode[30] = (exeImgOffset >> 8) & 0xFF;
  } else if (!isEga) {
    const exeImgOffset = imageOffsetInCodeSegment;
    exeCode[14] = exeImgOffset & 0xFF;
    exeCode[15] = (exeImgOffset >> 8) & 0xFF;
  } else {
    // EGA
    const exeImgOffset = imageOffsetInCodeSegment;
    exeCode[11] = exeImgOffset & 0xFF;
    exeCode[12] = (exeImgOffset >> 8) & 0xFF;
  }

  const payloadSize = codeLength + paletteDataBytes.length + pixelData.length;
  const headerParagraphs = 4; // 64-byte MZ header
  const headerSize = headerParagraphs * 16;
  const totalFileSize = headerSize + payloadSize;

  const pagesInFile = Math.ceil(totalFileSize / 512);
  const lastPageBytes = totalFileSize % 512;

  const header: DosExeHeader = {
    signature: 0x5A4D,            // "MZ" in little-endian
    lastPageBytes: lastPageBytes === 0 ? 512 : lastPageBytes,
    pagesInFile: pagesInFile,
    relocationsCount: 0,
    headerParagraphs: headerParagraphs,
    minExtraParagraphs: 0x0020,   // 512 bytes extra memory min
    maxExtraParagraphs: 0xFFFF,   // 640K max
    initialSS: 0x0000,
    initialSP: 0x0800,            // 2KB stack
    checksum: 0x0000,
    initialIP: 0x0000,            // Entry point CS:0000
    initialCS: 0x0000,
    relocTableOffset: 0x0040,     // 64 bytes
    overlayNumber: 0x0000,
  };

  const exeBuffer = new Uint8Array(totalFileSize);
  const view = new DataView(exeBuffer.buffer);

  // Write MZ Header (64 bytes)
  view.setUint16(0x00, header.signature, true);
  view.setUint16(0x02, header.lastPageBytes, true);
  view.setUint16(0x04, header.pagesInFile, true);
  view.setUint16(0x06, header.relocationsCount, true);
  view.setUint16(0x08, header.headerParagraphs, true);
  view.setUint16(0x0A, header.minExtraParagraphs, true);
  view.setUint16(0x0C, header.maxExtraParagraphs, true);
  view.setUint16(0x0E, header.initialSS, true);
  view.setUint16(0x10, header.initialSP, true);
  view.setUint16(0x12, header.checksum, true);
  view.setUint16(0x14, header.initialIP, true);
  view.setUint16(0x16, header.initialCS, true);
  view.setUint16(0x18, header.relocTableOffset, true);
  view.setUint16(0x1A, header.overlayNumber, true);

  // Reserved fields (0x1C to 0x3F) zeroed out

  // Write payload
  exeBuffer.set(exeCode, headerSize);
  if (paletteDataBytes.length > 0) {
    exeBuffer.set(paletteDataBytes, headerSize + codeLength);
  }
  exeBuffer.set(pixelData, headerSize + imageOffsetInCodeSegment);

  // Assembly Source code representation
  const asmSource = generateAsmSource(mode, isEga, paletteDataBytes.length > 0, pixelData.length);

  return {
    exeBuffer,
    comBuffer: comPayload,
    header,
    asmSource,
  };
}

function generateAsmSource(mode: GraphicMode, isEga: boolean, hasPalette: boolean, dataLen: number): string {
  if (isEga) {
    return `; ====================================================================
; Authentic MS-DOS EGA 320x200 16-Color 4-Plane Executable (MZ .EXE)
; Target: TASM / NASM / MASM (16-bit Real Mode x86)
; Mode: 0Dh (320x200, 16 Colors, 4 Bitplanes)
; ====================================================================

.MODEL SMALL
.STACK 800h

.DATA
; 32,000 bytes of EGA 4-plane bitmapped data
; 4 planes x 8,000 bytes (40 bytes/line * 200 lines)
ImagePlaneData  DB 32000 DUP(?) ; Linked from .EGA binary file

.CODE
START:
    MOV     AX, @DATA
    MOV     DS, AX

    ; 1. Set EGA Graphics Mode 0Dh (320x200 16 colors)
    MOV     AX, 000Dh
    INT     10h

    ; 2. Point ES to Video Display RAM at A000:0000
    MOV     AX, 0A000h
    MOV     ES, AX

    ; 3. Setup source pointer to planar image data
    MOV     SI, OFFSET ImagePlaneData

    ; 4. Copy 4 bitplanes into EGA memory
    XOR     BL, BL              ; BL = Current plane index (0..3)

CopyPlanesLoop:
    ; Compute Bitmask: AL = (1 SHL BL)
    MOV     AL, 01h
    MOV     CL, BL
    SHL     AL, CL
    MOV     AH, AL              ; AH holds plane bitmask

    ; Program EGA Sequencer Map Mask Register
    ; Port 03C4h = Index Register (Index 02h = Map Mask)
    ; Port 03C5h = Data Register
    MOV     DX, 03C4h
    MOV     AL, 02h
    OUT     DX, AX              ; Word write: AL->03C4h, AH->03C5h

    ; Blast 8,000 bytes (4,000 words) to ES:0000h
    XOR     DI, DI              ; Video memory offset = 0000h
    MOV     CX, 4000            ; 4000 words = 8000 bytes per plane
    CLD
    REP     MOVSW               ; Fast memory blast!

    INC     BL
    CMP     BL, 4
    JB      CopyPlanesLoop

    ; 5. Wait for keypress before returning to DOS
    XOR     AX, AX
    INT     16h

    ; 6. Restore 80x25 text mode (Mode 03h)
    MOV     AX, 0003h
    INT     10h

    ; 7. Clean exit to MS-DOS
    MOV     AX, 4C00h
    INT     21h

END START
`;
  }

  return `; ====================================================================
; Authentic MS-DOS VGA 320x200 256-Color Executable (MZ .EXE / .COM)
; Target: TASM / NASM / MASM (16-bit Real Mode x86)
; Mode: 13h (320x200, 256 Colors, 8-bit Linear Framebuffer)
; ====================================================================

.MODEL SMALL
.STACK 800h

.DATA
${hasPalette ? 'PaletteData     DB 768 DUP(?)   ; 256 colors x 3 (R, G, B in 0..63)' : '; Uses default VGA BIOS 256-color palette'}
ImageData       DB 64000 DUP(?) ; 320x200 linear byte array

.CODE
START:
    MOV     AX, @DATA
    MOV     DS, AX

    ; 1. Set VGA Graphics Mode 13h (320x200 256 colors)
    MOV     AX, 0013h
    INT     10h

${hasPalette ? `    ; 2. Program VGA DAC Palette Registers (Port 03C8h / 03C9h)
    MOV     DX, 03C8h           ; DAC Palette Index Register
    XOR     AL, AL              ; Start from color 0
    OUT     DX, AL
    INC     DX                  ; DX = 03C9h (DAC Data Register)
    MOV     SI, OFFSET PaletteData
    MOV     CX, 768             ; 256 colors * 3 bytes (R, G, B)
    CLD
SetPalLoop:
    LODSB
    OUT     DX, AL
    LOOP    SetPalLoop
` : ''}
    ; 3. Point ES to VGA linear framebuffer segment A000:0000
    MOV     AX, 0A000h
    MOV     ES, AX
    XOR     DI, DI              ; Offset 0000h
    MOV     SI, OFFSET ImageData
    MOV     CX, 32000           ; 32,000 words = 64,000 bytes
    CLD
    REP     MOVSW               ; Fast 16-bit hardware string copy

    ; 4. Wait for keypress
    MOV     AH, 00h
    INT     16h

    ; 5. Restore standard 80x25 text mode (Mode 03h)
    MOV     AX, 0003h
    INT     10h

    ; 6. Terminate process to MS-DOS
    MOV     AX, 4C00h
    INT     21h

END START
`;
}
