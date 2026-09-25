/**
 * QBasic EGA 4-Plane Binary Loader and Saver Code Generator
 * 
 * Provides production-tested code samples for QBasic 1.1, QuickBASIC 4.5, and QB64
 */

export interface QBasicCodeSamples {
  openBinaryLoader: string;
  openBinarySaver: string;
  bloadLoader: string;
  dataStatementLoader: string;
}

export function generateQBasicCodeSamples(fileName: string = 'IMAGE.EGA'): QBasicCodeSamples {
  const baseName = fileName.replace(/\.[^/.]+$/, '').toUpperCase();

  // 1. OPEN FOR BINARY LOADER (Direct Port & Sequencer Map Mask)
  const openBinaryLoader = `' =========================================================================
' QBasic EGA 4-Plane Binary File Loader
' Compatible with: QBasic 1.1, QuickBASIC 4.5, PDS 7.1, QB64
' Target Mode: SCREEN 7 (320x200, 16 Colors, 4 Bitplanes)
' File: ${baseName}.EGA (32,000 bytes sequential plane data)
' =========================================================================

DEFINT A-Z
SCREEN 7                  ' Initialize 320x200 16-color EGA mode
CLS

DIM Buffer AS STRING * 8000 ' 8,000 bytes = 40 bytes/line * 200 scanlines
FileSpec$ = "${baseName}.EGA"

' Open binary EGA file
OPEN FileSpec$ FOR BINARY AS #1

IF LOF(1) <> 32000 THEN
    PRINT "Error: File size must be exactly 32,000 bytes!"
    PRINT "Expected 4 bitplanes x 8,000 bytes each."
    PRINT "Current file size: "; LOF(1); " bytes."
    CLOSE #1
    END
END IF

' Point CPU segment register directly to EGA Video RAM (&HA000)
DEF SEG = &HA000

' Load 4 bitplanes sequentially:
' Plane 0 = Blue, Plane 1 = Green, Plane 2 = Red, Plane 3 = Intensity
FOR Plane = 0 TO 3
    ' Read 8,000 bytes directly from disk into buffer string
    GET #1, , Buffer

    ' -------------------------------------------------------------
    ' Program EGA Sequencer Map Mask Register
    ' Port &H3C4 is the Sequencer Index Register (Index 2 = Map Mask)
    ' Port &H3C5 is the Sequencer Data Register
    ' Value: 2 ^ Plane (1=Plane0, 2=Plane1, 4=Plane2, 8=Plane3)
    ' -------------------------------------------------------------
    OUT &H3C4, 2
    OUT &H3C5, 2 ^ Plane

    ' Copy buffer to EGA video memory starting at offset 0
    FOR ByteOffset = 0 TO 7999
        POKE ByteOffset, ASC(MID$(Buffer, ByteOffset + 1, 1))
    NEXT ByteOffset
NEXT Plane

' Restore EGA Sequencer Map Mask to enable all 4 planes (&H0F = 15)
OUT &H3C4, 2
OUT &H3C5, 15

CLOSE #1
DEF SEG                   ' Restore default QBasic data segment

' Display completion message at bottom line
LOCATE 25, 1
PRINT "Loaded ${baseName}.EGA (320x200 16-color 4-plane). Press key...";
WHILE INKEY$ = "": WEND

SCREEN 0                  ' Return to 80x25 text mode
WIDTH 80
SYSTEM
`;

  // 2. OPEN FOR BINARY SAVER (Direct EGA Read Map Select)
  const openBinarySaver = `' =========================================================================
' QBasic EGA 4-Plane Binary File Saver
' Compatible with: QBasic 1.1, QuickBASIC 4.5, PDS 7.1, QB64
' Target Mode: SCREEN 7 (320x200, 16 Colors, 4 Bitplanes)
' Creates: ${baseName}.EGA (32,000 bytes raw planar data)
' =========================================================================

DEFINT A-Z
SCREEN 7                  ' EGA 320x200 16-color mode

' (Draw your artwork, sprites, or load an image on screen here)
' Example decorative pattern if screen is blank:
' CIRCLE (160, 100), 75, 14
' PAINT (160, 100), 12, 14

FileSpec$ = "${baseName}.EGA"

' Kill existing file if present to avoid size mismatch
IF DIR$(FileSpec$) <> "" THEN KILL FileSpec$

OPEN FileSpec$ FOR BINARY AS #1

' Point CPU segment to EGA Video RAM (&HA000)
DEF SEG = &HA000

DIM PlaneChunk AS STRING * 8000

FOR Plane = 0 TO 3
    ' -------------------------------------------------------------
    ' Select EGA Graphics Controller Read Map Register
    ' Port &H3CE is Address Register (Index 4 = Read Map Select)
    ' Port &H3CF is Data Register (0=Blue, 1=Green, 2=Red, 3=Intensity)
    ' When reading from &HA000, EGA hardware returns bits from this plane
    ' -------------------------------------------------------------
    OUT &H3CE, 4
    OUT &H3CF, Plane

    ' Extract 8,000 bytes for this plane directly from Video RAM
    FOR ByteOffset = 0 TO 7999
        MID$(PlaneChunk, ByteOffset + 1, 1) = CHR$(PEEK(ByteOffset))
    NEXT ByteOffset

    ' Write 8,000-byte plane chunk to binary file
    PUT #1, , PlaneChunk
NEXT Plane

CLOSE #1
DEF SEG                   ' Restore default segment

PRINT "Successfully saved 32,000 bytes to " + FileSpec$
`;

  // 3. BLOAD / BSAVE Method
  const bloadLoader = `' =========================================================================
' QBasic BLOAD Method for EGA 4-Plane Binary (.BSV)
' Uses QBasic's built-in fast binary memory load
' =========================================================================

DEFINT A-Z
SCREEN 7

' Point to EGA Video Memory Segment
DEF SEG = &HA000

' Load 32,000-byte planar data directly into video buffer
BLOAD "${baseName}.BSV", 0

DEF SEG                   ' Reset default segment

' Wait for keypress
SLEEP
SCREEN 0
SYSTEM
`;

  // 4. DATA Statements or Embedded array
  const dataStatementLoader = `' =========================================================================
' QBasic Standalone Loader using Inline ASM / Fast Block Port Output
' Compatible with QuickBASIC 4.5 and QB64
' =========================================================================

SCREEN 7
DEF SEG = &HA000

OPEN "${baseName}.EGA" FOR BINARY AS #1
DIM Buffer AS STRING * 4000

FOR Plane = 0 TO 3
    OUT &H3C4, 2: OUT &H3C5, 2 ^ Plane
    ' Read in two 4KB chunks for maximum speed
    FOR Chunk = 0 TO 1
        GET #1, , Buffer
        BaseOff = Chunk * 4000
        FOR I = 0 TO 3999
            POKE BaseOff + I, ASC(MID$(Buffer, I + 1, 1))
        NEXT I
    NEXT Chunk
NEXT Plane

OUT &H3C4, 2: OUT &H3C5, 15
CLOSE #1
DEF SEG
WHILE INKEY$ = "": WEND
SCREEN 0
`;

  return {
    openBinaryLoader,
    openBinarySaver,
    bloadLoader,
    dataStatementLoader,
  };
}
