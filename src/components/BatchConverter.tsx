import React, { useState, useRef } from 'react';
import {
  Archive,
  Upload,
  Play,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  FileCode,
  Binary,
  Monitor,
} from 'lucide-react';
import { AspectRatioMode, DitherAlgorithm, GraphicMode, RgbColor } from '../types/dos';
import { resampleToTarget, quantizeAndDither } from '../utils/dithering';
import { encodeEga4Planes, createQBasicBsaveBuffer } from '../utils/egaPlanes';
import { buildDosExecutable } from '../utils/dosExeBuilder';
import { generateQBasicCodeSamples } from '../utils/qbasicGenerator';
import { createZipArchive, ZipEntry } from '../utils/zipBuilder';
import { downloadBinaryFile } from '../utils/fileDownloader';

export interface BatchItem {
  id: string;
  file: File | { name: string; url: string };
  name: string;
  cleanDosName: string; // 8.3 filename, e.g. "CITY.EXE"
  previewUrl: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  result?: {
    exeBuffer: Uint8Array;
    comBuffer: Uint8Array;
    egaBuffer?: Uint8Array;
    loaderBas: string;
    exeSize: number;
  };
}

interface BatchConverterProps {
  currentMode: GraphicMode;
  currentDither: DitherAlgorithm;
  currentStrength: number;
  currentAspectMode: AspectRatioMode;
  customPalette?: RgbColor[];
}

export const BatchConverter: React.FC<BatchConverterProps> = ({
  currentMode,
  currentDither,
  currentStrength,
  currentAspectMode,
  customPalette,
}) => {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [zipBlobReady, setZipBlobReady] = useState<Uint8Array | null>(null);

  // Batch Export Options
  const [includeExe, setIncludeExe] = useState<boolean>(true);
  const [includeCom, setIncludeCom] = useState<boolean>(true);
  const [includeEga, setIncludeEga] = useState<boolean>(true);
  const [includeBas, setIncludeBas] = useState<boolean>(true);
  const [includeBatchMenu, setIncludeBatchMenu] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Make an authentic 8.3 uppercase DOS filename from input name
  const toDosName = (rawName: string, existingNames: Set<string>): string => {
    let base = rawName
      .replace(/\.[^/.]+$/, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_');
    if (!base) base = 'IMAGE';
    base = base.substring(0, 8);

    let candidate = base;
    let counter = 1;
    while (existingNames.has(candidate)) {
      const suffix = counter.toString();
      candidate = base.substring(0, 8 - suffix.length) + suffix;
      counter++;
    }
    existingNames.add(candidate);
    return candidate;
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const existingNames = new Set(items.map((it) => it.cleanDosName));
    const newItems: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const dosName = toDosName(file.name, existingNames);
      newItems.push({
        id: `${Date.now()}_${i}_${Math.random()}`,
        file,
        name: file.name,
        cleanDosName: dosName,
        previewUrl: URL.createObjectURL(file),
        status: 'pending',
      });
    }

    setItems((prev) => [...prev, ...newItems]);
    setZipBlobReady(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleLoadSampleBatch = () => {
    const samples = [
      { name: 'CYBER.PNG', path: '/src/assets/images/dos_cyberpunk_city_1790301713205.jpg' },
      { name: 'MARINE.PNG', path: '/src/assets/images/dos_space_marine_1790301724435.jpg' },
      { name: 'CASTLE.PNG', path: '/src/assets/images/dos_fantasy_castle_1790301735690.jpg' },
    ];

    const existingNames = new Set(items.map((it) => it.cleanDosName));
    const newItems: BatchItem[] = samples.map((s, idx) => ({
      id: `sample_${Date.now()}_${idx}`,
      file: { name: s.name, url: s.path },
      name: s.name,
      cleanDosName: toDosName(s.name, existingNames),
      previewUrl: s.path,
      status: 'pending',
    }));

    setItems((prev) => [...prev, ...newItems]);
    setZipBlobReady(null);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setZipBlobReady(null);
  };

  const handleClearAll = () => {
    setItems([]);
    setZipBlobReady(null);
    setProgress(0);
  };

  // Convert an image element or URL to HTMLImageElement
  const loadImageAsync = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const processSingleItem = async (item: BatchItem): Promise<BatchItem> => {
    try {
      const img = await loadImageAsync(item.previewUrl);
      const targetW = 320;
      const targetH = 200;

      // 1. Resample
      const resampledData = resampleToTarget(
        img,
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        targetW,
        targetH,
        currentAspectMode
      );

      // 2. Dither and Quantize
      const { colorIndices, palette } = quantizeAndDither(resampledData, {
        mode: currentMode,
        dither: currentDither,
        strength: currentStrength,
        brightness: 0,
        contrast: 0,
        gamma: 1.0,
        aspectMode: currentAspectMode,
        serpentine: true,
        customPalette,
      });

      // 3. Bitplanes or linear data
      let exePayload: Uint8Array = colorIndices;
      let egaBuffer: Uint8Array | undefined = undefined;

      if (currentMode === 'ega_screen7' || currentMode === 'ega_screen9') {
        const egaPlanes = encodeEga4Planes(colorIndices, targetW, targetH);
        exePayload = egaPlanes.combined;
        egaBuffer = egaPlanes.combined;
      }

      // 4. Build .EXE and .COM
      const paletteRgbList = palette.map((p) => [p.r, p.g, p.b] as [number, number, number]);
      const exeBuild = buildDosExecutable(currentMode, exePayload, paletteRgbList);

      // 5. Generate QBasic Code
      const qbasicCode = generateQBasicCodeSamples(`${item.cleanDosName}.EGA`);

      return {
        ...item,
        status: 'done',
        result: {
          exeBuffer: exeBuild.exeBuffer,
          comBuffer: exeBuild.comBuffer,
          egaBuffer,
          loaderBas: qbasicCode.openBinaryLoader,
          exeSize: exeBuild.exeBuffer.length,
        },
      };
    } catch (err: any) {
      return {
        ...item,
        status: 'error',
        error: err?.message || 'Processing failed',
      };
    }
  };

  // Run Batch Conversion & Create ZIP Archive
  const handleRunBatchAndBuildZip = async () => {
    if (items.length === 0) return;

    setIsProcessing(true);
    setProgress(0);

    const updatedItems: BatchItem[] = [];
    const zipEntries: ZipEntry[] = [];
    const dosMenuLines: string[] = [
      '@echo off',
      'cls',
      'echo ==========================================================',
      'echo            MS-DOS BATCH EXECUTABLES MENU',
      'echo ==========================================================',
      'echo.',
    ];

    for (let i = 0; i < items.length; i++) {
      const cur = items[i];
      // Mark as processing in UI
      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'processing' } : it))
      );

      const processed = await processSingleItem(cur);
      updatedItems.push(processed);

      if (processed.result) {
        const baseName = processed.cleanDosName;

        // Add to ZIP archive entries
        if (includeExe) {
          zipEntries.push({
            filename: `${baseName}.EXE`,
            data: processed.result.exeBuffer,
          });
          dosMenuLines.push(`echo [${i + 1}] Run ${baseName}.EXE`);
        }

        if (includeCom) {
          zipEntries.push({
            filename: `${baseName}.COM`,
            data: processed.result.comBuffer,
          });
        }

        if (includeEga && processed.result.egaBuffer) {
          zipEntries.push({
            filename: `${baseName}.EGA`,
            data: processed.result.egaBuffer,
          });
        }

        if (includeBas) {
          zipEntries.push({
            filename: `${baseName}.BAS`,
            data: processed.result.loaderBas,
          });
        }
      }

      setProgress(Math.round(((i + 1) / items.length) * 100));
    }

    // Add README.TXT with DOSBox instructions
    const readmeContent = `========================================================================
MS-DOS EXECUTABLES & EGA 4-PLANE GRAPHICS BATCH
Generated by DOS Graphics Studio
========================================================================

FILES INCLUDED:
- *.EXE : Authentic 16-bit MZ Executable (Run directly in DOSBox or MS-DOS)
- *.COM : 16-bit Flat Memory COM Executable (Starts at CS:0100h)
- *.EGA : 32,000-byte raw planar bitmapped graphics (4 planes x 8,000 bytes)
- *.BAS : QBasic 1.1 / QuickBASIC 4.5 / QB64 Binary Loader Script
- RUN.BAT: DOS Interactive Launch Menu

HOW TO RUN IN DOSBOX:
1. Extract all files into a directory (e.g. C:\\DOSGAMES\\)
2. In DOSBox, mount the folder:
     MOUNT C C:\\DOSGAMES
     C:
3. Run any executable or the launch menu:
     RUN.BAT
     or
     ${items[0]?.cleanDosName || 'IMAGE'}.EXE

HOW TO RUN IN QBASIC:
     QBASIC /RUN ${items[0]?.cleanDosName || 'IMAGE'}.BAS

Press any key when the graphics are displayed to return to the DOS prompt.
`;

    zipEntries.push({
      filename: 'README.TXT',
      data: readmeContent,
    });

    if (includeBatchMenu) {
      dosMenuLines.push('echo.');
      dosMenuLines.push('echo [Q] Quit to DOS Prompt');
      dosMenuLines.push('echo.');
      dosMenuLines.push(':loop');
      dosMenuLines.push('choice /c:123456789q /n "Select a program: "');
      items.forEach((it, idx) => {
        dosMenuLines.push(`if errorlevel ${idx + 2} goto run_${it.cleanDosName}`);
      });
      dosMenuLines.push('goto quit');
      items.forEach((it) => {
        dosMenuLines.push(`:run_${it.cleanDosName}`);
        dosMenuLines.push(`cls`);
        dosMenuLines.push(`${it.cleanDosName}.EXE`);
        dosMenuLines.push(`goto loop`);
      });
      dosMenuLines.push(':quit');
      dosMenuLines.push('echo Thank you for using DOS Graphics Studio.');

      zipEntries.push({
        filename: 'RUN.BAT',
        data: dosMenuLines.join('\r\n'),
      });
    }

    // Build the ZIP archive in memory
    const zipData = createZipArchive(zipEntries);
    setZipBlobReady(zipData);
    setItems(updatedItems);
    setIsProcessing(false);

    // Automatically trigger ZIP download
    downloadBinaryFile(zipData, 'DOS_BATCH_EXECUTABLES.ZIP', 'application/zip');
  };

  const handleDownloadZipManual = () => {
    if (!zipBlobReady) return;
    downloadBinaryFile(zipBlobReady, 'DOS_BATCH_EXECUTABLES.ZIP', 'application/zip');
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            Batch Image to MS-DOS Executable ZIP Utility
          </h2>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs font-mono text-neutral-400">
            {items.length} {items.length === 1 ? 'image' : 'images'} queued
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSampleBatch}
            disabled={isProcessing}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Sample Batch (3)</span>
          </button>

          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isProcessing}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded text-neutral-400 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Drag & Drop Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-neutral-700 hover:border-amber-500/70 rounded-lg p-5 text-center cursor-pointer transition-colors bg-neutral-950/40 flex flex-col items-center justify-center min-h-[100px]"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFilesSelected(e.target.files)}
        />
        <Upload className="w-6 h-6 text-neutral-400 mb-2" />
        <div className="text-xs font-medium text-neutral-200">
          Drop multiple images here or <span className="text-amber-400 underline underline-offset-2">browse files</span>
        </div>
        <div className="text-[11px] text-neutral-500 mt-1">
          Supports multi-selection: PNG, JPG, WebP, GIF, BMP · Automatic 8.3 DOS naming
        </div>
      </div>

      {/* ZIP Options & Convert Button */}
      {items.length > 0 && (
        <div className="bg-neutral-950/70 p-3.5 rounded-lg border border-neutral-800/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-neutral-300">
              Files to include inside ZIP archive:
            </span>

            <div className="flex flex-wrap items-center gap-4 text-neutral-300 text-[11px]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExe}
                  onChange={(e) => setIncludeExe(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
                />
                <span className="font-mono">*.EXE</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCom}
                  onChange={(e) => setIncludeCom(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
                />
                <span className="font-mono">*.COM</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEga}
                  onChange={(e) => setIncludeEga(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
                />
                <span className="font-mono">*.EGA (32KB)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBas}
                  onChange={(e) => setIncludeBas(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
                />
                <span className="font-mono">*.BAS (QBasic)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeBatchMenu}
                  onChange={(e) => setIncludeBatchMenu(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
                />
                <span className="font-mono">RUN.BAT Menu</span>
              </label>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-neutral-800">
            <div className="text-[11px] text-neutral-400 font-mono">
              Mode: <strong className="text-amber-400">{currentMode}</strong> · Dither:{' '}
              <strong className="text-amber-400">{currentDither}</strong>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {zipBlobReady && (
                <button
                  type="button"
                  onClick={handleDownloadZipManual}
                  className="px-3 py-1.5 text-xs font-medium rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Re-download ZIP ({Math.round(zipBlobReady.length / 1024)} KB)</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleRunBatchAndBuildZip}
                disabled={isProcessing}
                className={`flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded flex items-center justify-center gap-2 transition-colors ${
                  isProcessing
                    ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-md cursor-pointer'
                }`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>
                  {isProcessing
                    ? `Processing Batch (${progress}%)...`
                    : `Process All & Download ZIP Archive (${items.length})`}
                </span>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {isProcessing && (
            <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Batch Queue Item Cards */}
      {items.length > 0 && (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className={`p-2.5 rounded border flex items-center justify-between gap-3 transition-colors ${
                item.status === 'processing'
                  ? 'border-amber-500/60 bg-amber-500/5'
                  : item.status === 'done'
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-neutral-800 bg-neutral-950/60'
              }`}
            >
              {/* Thumbnail + Name */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded overflow-hidden bg-neutral-800 shrink-0 border border-neutral-700">
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-200 truncate">
                      {item.cleanDosName}.EXE
                    </span>
                    <span className="text-[10px] text-neutral-500 truncate">
                      ({item.name})
                    </span>
                  </div>

                  <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-2 mt-0.5">
                    {item.status === 'pending' && (
                      <span className="text-neutral-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Queued
                      </span>
                    )}
                    {item.status === 'processing' && (
                      <span className="text-amber-400 animate-pulse flex items-center gap-1">
                        Dithering & Packing...
                      </span>
                    )}
                    {item.status === 'done' && (
                      <span className="text-emerald-400 flex items-center gap-1 font-sans text-[11px]">
                        <CheckCircle2 className="w-3 h-3" /> Ready ({Math.round((item.result?.exeSize || 32000) / 1024)} KB)
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="text-rose-400">{item.error}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Individual Item Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {item.result && (
                  <button
                    onClick={() => downloadBinaryFile(item.result!.exeBuffer, `${item.cleanDosName}.EXE`)}
                    className="p-1.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 transition-colors"
                    title={`Download ${item.cleanDosName}.EXE individually`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  disabled={isProcessing}
                  className="p-1.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition-colors"
                  title="Remove from batch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
