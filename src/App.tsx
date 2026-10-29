import React, { useState, useEffect, useCallback, useTransition, useMemo } from 'react';
import { AspectRatioMode, ConversionResult, DitherAlgorithm, GraphicMode, RgbColor } from './types/dos';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ConversionControls } from './components/ConversionControls';
import { CrtPreview } from './components/CrtPreview';
import { PaletteEditor } from './components/PaletteEditor';
import { BatchConverter } from './components/BatchConverter';
import { ExeHeaderInspector } from './components/ExeHeaderInspector';
import { QBasicCodeViewer } from './components/QBasicCodeViewer';
import { ExportPanel } from './components/ExportPanel';
import { VirtualDosRunner } from './components/VirtualDosRunner';
import { quantizeAndDither, resampleToTarget } from './utils/dithering';
import { createQBasicBsaveBuffer, encodeEga4Planes } from './utils/egaPlanes';
import { buildDosExecutable } from './utils/dosExeBuilder';
import { generateQBasicCodeSamples } from './utils/qbasicGenerator';
import { downloadBinaryFile, downloadTextFile } from './utils/fileDownloader';
import { clonePalette, EGA_16_PALETTE } from './utils/palettes';

export default function App() {
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('CYBERPUNK.PNG');
  const [activePresetId, setActivePresetId] = useState<string>('cyberpunk');

  // Conversion Settings
  const [mode, setMode] = useState<GraphicMode>('ega_screen7'); // EGA Mode 0Dh / QBasic SCREEN 7
  const [dither, setDither] = useState<DitherAlgorithm>('floyd_steinberg');
  const [strength, setStrength] = useState<number>(0.85);
  const [brightness, setBrightness] = useState<number>(0);
  const [contrast, setContrast] = useState<number>(10);
  const [gamma, setGamma] = useState<number>(1.0);
  const [aspectMode, setAspectMode] = useState<AspectRatioMode>('fit_letterbox');
  const [serpentine, setSerpentine] = useState<boolean>(true);

  // 16-Color Palette Customization
  const [customPalette, setCustomPalette] = useState<RgbColor[]>(clonePalette(EGA_16_PALETTE));
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState<number>(0);
  const [autoReDither, setAutoReDither] = useState<boolean>(false);
  const [highlightColorIndex, setHighlightColorIndex] = useState<number | null>(null);

  // Conversion Result
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [asmSource, setAsmSource] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  // Load default preset on mount
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setCurrentImage(img);
      setCurrentFileName('CYBERPUNK.PNG');
    };
    img.src = '/src/assets/images/dos_cyberpunk_city_1790301713205.jpg';
  }, []);

  // Process image conversion
  const processConversion = useCallback((paletteToUse?: RgbColor[]) => {
    if (!currentImage) return;

    startTransition(() => {
      const targetW = 320;
      const targetH = 200;

      // 1. Resample to 320x200
      const resampledData = resampleToTarget(
        currentImage,
        currentImage.naturalWidth || currentImage.width,
        currentImage.naturalHeight || currentImage.height,
        targetW,
        targetH,
        aspectMode
      );

      // Active palette to use
      const activePal = paletteToUse || customPalette;

      // 2. Quantize and dither
      const { colorIndices, rgbPixels, palette } = quantizeAndDither(resampledData, {
        mode,
        dither,
        strength,
        brightness,
        contrast,
        gamma,
        aspectMode,
        serpentine,
        customPalette: activePal,
      });

      // 3. EGA 4-Plane conversion (if applicable)
      let egaPlanes = undefined;
      let bsaveBuffer = undefined;
      let exePayload: Uint8Array = colorIndices;

      if (mode === 'ega_screen7' || mode === 'ega_screen9') {
        egaPlanes = encodeEga4Planes(colorIndices, targetW, targetH);
        exePayload = egaPlanes.combined; // 32,000 bytes
        bsaveBuffer = createQBasicBsaveBuffer(egaPlanes.combined, 0xA000, 0x0000);
      } else {
        // VGA Mode 13h linear 64,000 bytes
        exePayload = colorIndices;
        bsaveBuffer = createQBasicBsaveBuffer(colorIndices, 0xA000, 0x0000);
      }

      // 4. Build authentic MS-DOS MZ Executable and .COM binary
      const paletteRgbList = palette.map((p) => [p.r, p.g, p.b] as [number, number, number]);
      const exeBuild = buildDosExecutable(mode, exePayload, paletteRgbList);

      setAsmSource(exeBuild.asmSource);

      setResult({
        width: targetW,
        height: targetH,
        mode,
        dither,
        colorIndices,
        rgbPixels,
        palette,
        egaPlanes,
        exeBuffer: exeBuild.exeBuffer,
        comBuffer: exeBuild.comBuffer,
        exeHeader: exeBuild.header,
        bsaveBuffer,
      });
    });
  }, [currentImage, mode, dither, strength, brightness, contrast, gamma, aspectMode, serpentine, customPalette]);

  useEffect(() => {
    processConversion();
  }, [processConversion]);

  // Color frequency map for current image
  const colorCounts = useMemo(() => {
    if (!result) return new Map<number, number>();
    const counts = new Map<number, number>();
    for (let i = 0; i < result.colorIndices.length; i++) {
      const c = result.colorIndices[i];
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return counts;
  }, [result]);

  // Real-Time Palette Update Handler
  const handlePaletteChange = (newPalette: RgbColor[], immediateOnly: boolean = false) => {
    setCustomPalette(newPalette);

    if (immediateOnly && result) {
      // 60fps Real-Time Hardware DAC swap:
      // Update pixel colors in the canvas buffer without recalculating dithering
      const updatedRgbPixels = new Uint8ClampedArray(result.rgbPixels.length);
      const numPixels = result.colorIndices.length;

      for (let i = 0; i < numPixels; i++) {
        const cIdx = result.colorIndices[i];
        const color = newPalette[cIdx] || newPalette[cIdx % newPalette.length];
        const pOff = i * 4;
        updatedRgbPixels[pOff] = color.r;
        updatedRgbPixels[pOff + 1] = color.g;
        updatedRgbPixels[pOff + 2] = color.b;
        updatedRgbPixels[pOff + 3] = 255;
      }

      // Update executable with new DAC palette registers
      const paletteRgbList = newPalette.map((p) => [p.r, p.g, p.b] as [number, number, number]);
      const exePayload = result.egaPlanes ? result.egaPlanes.combined : result.colorIndices;
      const exeBuild = buildDosExecutable(mode, exePayload, paletteRgbList);

      setResult((prev) =>
        prev
          ? {
              ...prev,
              rgbPixels: updatedRgbPixels,
              palette: newPalette,
              exeBuffer: exeBuild.exeBuffer,
              comBuffer: exeBuild.comBuffer,
              exeHeader: exeBuild.header,
            }
          : null
      );
      setAsmSource(exeBuild.asmSource);
    } else {
      // Full re-dither with the new palette colors
      processConversion(newPalette);
    }
  };

  const handleResetPalette = () => {
    const defaultPal = clonePalette(EGA_16_PALETTE);
    setCustomPalette(defaultPal);
    processConversion(defaultPal);
  };

  const handleTriggerReDither = () => {
    processConversion(customPalette);
  };

  const handleImageLoaded = (img: HTMLImageElement, name: string) => {
    setCurrentImage(img);
    setCurrentFileName(name);
    if (name.includes('cyberpunk')) setActivePresetId('cyberpunk');
    else if (name.includes('marine')) setActivePresetId('spacemarine');
    else if (name.includes('castle') || name.includes('fantasy')) setActivePresetId('fantasy');
    else setActivePresetId('');
  };

  const handleResetAdjustments = () => {
    setBrightness(0);
    setContrast(0);
    setGamma(1.0);
    setStrength(0.85);
  };

  const handleDownloadExe = () => {
    if (!result) return;
    const base = currentFileName.replace(/\.[^/.]+$/, '').toUpperCase();
    downloadBinaryFile(result.exeBuffer, `${base}.EXE`);
  };

  const handleDownloadCom = () => {
    if (!result) return;
    const base = currentFileName.replace(/\.[^/.]+$/, '').toUpperCase();
    downloadBinaryFile(result.comBuffer, `${base}.COM`);
  };

  const handleDownloadEga = () => {
    if (!result) return;
    const base = currentFileName.replace(/\.[^/.]+$/, '').toUpperCase();
    if (result.egaPlanes) {
      downloadBinaryFile(result.egaPlanes.combined, `${base}.EGA`);
    } else {
      downloadBinaryFile(result.colorIndices, `${base}.BIN`);
    }
  };

  const handleDownloadBas = (code: string, fileName: string) => {
    downloadTextFile(code, fileName);
  };

  const qbasicSamples = generateQBasicCodeSamples(currentFileName);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Bar following 3-Zone contract */}
      <Header onQuickExport={handleDownloadExe} hasImage={!!result} />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Title & Technical Context Subtitle */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-neutral-800 pb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-100">
              MS-DOS Executable & QBasic EGA 4-Plane Converter
            </h1>
            <p className="text-xs text-neutral-400 mt-1 max-w-3xl leading-relaxed">
              Transform images into authentic 16-bit MS-DOS MZ <code className="font-mono text-amber-400">.EXE</code> / <code className="font-mono text-amber-400">.COM</code> executables, hardware 320x200 dithered bitplanes, QBasic <code className="font-mono text-amber-400">OPEN ... FOR BINARY</code> EGA code, and batch ZIP archives.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono shrink-0">
            <span>Video Segment: <strong className="text-amber-400">&HA000</strong></span>
            <span>·</span>
            <span>Planes: <strong className="text-neutral-300">4 (B/G/R/I)</strong></span>
          </div>
        </div>

        {/* Section 1: Upload and Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 space-y-4">
            <ImageUploader onImageLoaded={handleImageLoaded} activePresetId={activePresetId} />
            <ConversionControls
              mode={mode}
              onModeChange={setMode}
              dither={dither}
              onDitherChange={setDither}
              strength={strength}
              onStrengthChange={setStrength}
              brightness={brightness}
              onBrightnessChange={setBrightness}
              contrast={contrast}
              onContrastChange={setContrast}
              gamma={gamma}
              onGammaChange={setGamma}
              aspectMode={aspectMode}
              onAspectModeChange={setAspectMode}
              serpentine={serpentine}
              onSerpentineChange={setSerpentine}
              onResetAdjustments={handleResetAdjustments}
            />
          </div>

          {/* Section 2: CRT Monitor Preview & Bitplane Inspector */}
          <div className="lg:col-span-7">
            <CrtPreview result={result} isLoading={isPending} />
          </div>
        </div>

        {/* Section 3: Interactive 16-Color EGA/VGA Palette Editor */}
        <div id="palette-editor-section">
          <PaletteEditor
            palette={customPalette}
            onPaletteChange={handlePaletteChange}
            onResetToDefault={handleResetPalette}
            colorCounts={colorCounts}
            selectedColorIndex={selectedPaletteIndex}
            onSelectColorIndex={setSelectedPaletteIndex}
            autoReDither={autoReDither}
            onToggleAutoReDither={setAutoReDither}
            onTriggerReDither={handleTriggerReDither}
            highlightColorIndex={highlightColorIndex}
            onToggleHighlightColor={setHighlightColorIndex}
          />
        </div>

        {/* Section 4: Batch Image to MS-DOS Executable ZIP Utility */}
        <div id="batch-converter-section">
          <BatchConverter
            currentMode={mode}
            currentDither={dither}
            currentStrength={strength}
            currentAspectMode={aspectMode}
            customPalette={customPalette}
          />
        </div>

        {/* Section 5: MS-DOS MZ Executable Header Inspector */}
        <ExeHeaderInspector
          header={result?.exeHeader || null}
          exeBuffer={result?.exeBuffer || null}
          comBuffer={result?.comBuffer || null}
          asmSource={asmSource}
          onDownloadExe={handleDownloadExe}
          onDownloadCom={handleDownloadCom}
        />

        {/* Section 6: QBasic EGA 4-Plane Binary Loader and Saver */}
        <QBasicCodeViewer
          samples={qbasicSamples}
          onDownloadBas={handleDownloadBas}
          onDownloadEga={handleDownloadEga}
          egaFileSize={result?.egaPlanes?.combined.length || 32000}
        />

        {/* Section 7: Interactive Virtual MS-DOS Terminal Simulator */}
        <VirtualDosRunner result={result} fileName={currentFileName} />

        {/* Section 8: Comprehensive Binary Export Center */}
        <ExportPanel result={result} baseFileName={currentFileName} />
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>DOS Graphics Studio</span>
            <span>·</span>
            <span>MS-DOS Real Mode x86 &amp; QBasic 1.1 / QuickBASIC 4.5 / QB64</span>
          </div>
          <div>320x200 4-Plane Bitmapped VRAM Architecture (&HA000:0000)</div>
        </div>
      </footer>
    </div>
  );
}
