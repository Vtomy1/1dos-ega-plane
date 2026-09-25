import React, { useRef, useEffect, useState, useMemo } from 'react';
import { ConversionResult, PixelInspection } from '../types/dos';
import { Monitor, ZoomIn, Eye, Sparkles, Check, Info } from 'lucide-react';

interface CrtPreviewProps {
  result: ConversionResult | null;
  isLoading: boolean;
}

export const CrtPreview: React.FC<CrtPreviewProps> = ({ result, isLoading }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [enableScanlines, setEnableScanlines] = useState(true);
  const [aspectCrt43, setAspectCrt43] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(2); // 1x, 2x, 3x, 4x
  const [inspectedPixel, setInspectedPixel] = useState<PixelInspection | null>(null);
  const [highlightColorIndex, setHighlightColorIndex] = useState<number | null>(null);

  // Draw 320x200 canvas
  useEffect(() => {
    if (!result || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create ImageData from rgbPixels
    const imgData = new ImageData(new Uint8ClampedArray(result.rgbPixels), result.width, result.height);

    // If highlightColorIndex is active, dim other colors
    if (highlightColorIndex !== null) {
      for (let i = 0; i < result.width * result.height; i++) {
        const cIdx = result.colorIndices[i];
        const pOffset = i * 4;
        if (cIdx !== highlightColorIndex) {
          imgData.data[pOffset] = Math.floor(imgData.data[pOffset] * 0.2);
          imgData.data[pOffset + 1] = Math.floor(imgData.data[pOffset + 1] * 0.2);
          imgData.data[pOffset + 2] = Math.floor(imgData.data[pOffset + 2] * 0.2);
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [result, highlightColorIndex]);

  // Handle canvas mouse move to inspect pixel
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!result || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = result.width / rect.width;
    const scaleY = result.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    if (x >= 0 && x < result.width && y >= 0 && y < result.height) {
      const idx = y * result.width + x;
      const colorIndex = result.colorIndices[idx];
      const pColor = result.palette[colorIndex] || { r: 0, g: 0, b: 0, hex: '#000000' };

      const inspection: PixelInspection = {
        x,
        y,
        colorIndex,
        rgb: [pColor.r, pColor.g, pColor.b],
        hex: pColor.hex || '#000000',
      };

      if (result.mode === 'ega_screen7' || result.mode === 'ega_screen9') {
        const c = colorIndex & 0x0F;
        inspection.egaPlanes = {
          plane0_blue: (c & 0x01) ? 1 : 0,
          plane1_green: (c & 0x02) ? 1 : 0,
          plane2_red: (c & 0x04) ? 1 : 0,
          plane3_intensity: (c & 0x08) ? 1 : 0,
        };
      }

      setInspectedPixel(inspection);
    }
  };

  const handleMouseLeave = () => {
    setInspectedPixel(null);
  };

  // Color frequency map in the current image
  const colorCounts = useMemo(() => {
    if (!result) return new Map<number, number>();
    const counts = new Map<number, number>();
    for (let i = 0; i < result.colorIndices.length; i++) {
      const c = result.colorIndices[i];
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return counts;
  }, [result]);

  return (
    <div id="canvas-viewport" className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            Hardware 320x200 CRT Canvas
          </h2>
          <span className="text-xs text-neutral-400">·</span>
          <span className="text-xs font-mono text-neutral-400">
            {result?.mode === 'ega_screen7' ? 'SCREEN 7 (EGA)' : result?.mode === 'cga_mode4' ? 'SCREEN 1 (CGA)' : 'SCREEN 13 (VGA)'}
          </span>
        </div>

        {/* Viewport Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAspectCrt43(!aspectCrt43)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              aspectCrt43
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
            title="MS-DOS 320x200 was stretched to 4:3 on CRT monitors with 1.2:1 tall non-square pixels"
          >
            CRT 4:3 Aspect ({aspectCrt43 ? 'Active' : '1:1 Square'})
          </button>

          <button
            onClick={() => setEnableScanlines(!enableScanlines)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              enableScanlines
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Scanlines ({enableScanlines ? 'ON' : 'OFF'})
          </button>

          {/* Zoom Buttons */}
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded p-0.5">
            {[1, 2, 3, 4].map((z) => (
              <button
                key={z}
                onClick={() => setZoomLevel(z)}
                className={`px-2 py-0.5 text-xs font-mono rounded ${
                  zoomLevel === z ? 'bg-amber-500 text-neutral-950 font-bold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {z}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Screen Bezel */}
      <div className="flex flex-col items-center justify-center p-3 bg-neutral-950/80 rounded-lg border border-neutral-800/80">
        <div
          className={`crt-screen transition-all max-w-full overflow-hidden rounded bg-black flex items-center justify-center relative shadow-2xl border-4 border-neutral-800 ${
            enableScanlines ? 'crt-scanlines crt-vignette' : ''
          }`}
          style={{
            // When 4:3 aspect is active, height is scaled by 1.2x (320 / 240 = 4:3)
            aspectRatio: aspectCrt43 ? '4 / 3' : '16 / 10',
            width: `${Math.min(100, zoomLevel * 25)}%`,
            minWidth: '280px',
            maxWidth: '680px',
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 z-30 bg-neutral-950/80 flex items-center justify-center text-xs text-amber-400 font-mono">
              Rendering Dither & Bitplanes...
            </div>
          )}

          <canvas
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="w-full h-full object-contain cursor-crosshair [image-rendering:pixelated]"
          />

          {/* Power LED Indicator */}
          <div className="absolute bottom-1 right-2 flex items-center gap-1 z-20 pointer-events-none opacity-70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
            <span className="text-[9px] font-mono text-neutral-500 tracking-wider">RGB CRT</span>
          </div>
        </div>
      </div>

      {/* Pixel Inspection HUD */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950/60 p-3 rounded border border-neutral-800/60">
        {/* Pixel Position & RGB Info */}
        <div className="space-y-1 text-xs">
          <div className="text-neutral-400 font-medium flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Pixel Inspector</span>
          </div>
          {inspectedPixel ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-neutral-300">
                  X: <strong className="text-amber-400">{inspectedPixel.x}</strong>, Y:{' '}
                  <strong className="text-amber-400">{inspectedPixel.y}</strong>
                </span>
                <span className="text-neutral-600">·</span>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-3.5 h-3.5 rounded-xs border border-neutral-600 inline-block shadow-xs"
                    style={{ backgroundColor: inspectedPixel.hex }}
                  />
                  <span className="font-mono text-neutral-200 font-semibold">
                    Index {inspectedPixel.colorIndex} ({inspectedPixel.hex})
                  </span>
                </div>
              </div>
              <div className="font-mono text-[11px] text-neutral-400">
                RGB({inspectedPixel.rgb[0]}, {inspectedPixel.rgb[1]}, {inspectedPixel.rgb[2]})
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500 pt-1">
              Hover over any pixel on the CRT screen to inspect hardware coordinates, color palette index, and EGA plane bits.
            </div>
          )}
        </div>

        {/* EGA 4-Plane Bit Breakdown */}
        <div className="space-y-1 text-xs">
          <div className="text-neutral-400 font-medium">EGA 4-Plane Video RAM State (&HA000)</div>
          {inspectedPixel?.egaPlanes ? (
            <div className="space-y-1 pt-1">
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
                <div className="p-1 rounded bg-blue-950/50 border border-blue-800/60 text-center">
                  <div className="text-blue-400 text-[10px]">Plane 0 (B)</div>
                  <div className="font-bold text-neutral-100">{inspectedPixel.egaPlanes.plane0_blue}</div>
                </div>
                <div className="p-1 rounded bg-emerald-950/50 border border-emerald-800/60 text-center">
                  <div className="text-emerald-400 text-[10px]">Plane 1 (G)</div>
                  <div className="font-bold text-neutral-100">{inspectedPixel.egaPlanes.plane1_green}</div>
                </div>
                <div className="p-1 rounded bg-rose-950/50 border border-rose-800/60 text-center">
                  <div className="text-rose-400 text-[10px]">Plane 2 (R)</div>
                  <div className="font-bold text-neutral-100">{inspectedPixel.egaPlanes.plane2_red}</div>
                </div>
                <div className="p-1 rounded bg-amber-950/50 border border-amber-800/60 text-center">
                  <div className="text-amber-400 text-[10px]">Plane 3 (I)</div>
                  <div className="font-bold text-neutral-100">{inspectedPixel.egaPlanes.plane3_intensity}</div>
                </div>
              </div>
              <div className="text-[10px] font-mono text-neutral-400">
                VRAM Byte Offset: {Math.floor(inspectedPixel.x / 8) + inspectedPixel.y * 40} (&H
                {(Math.floor(inspectedPixel.x / 8) + inspectedPixel.y * 40).toString(16).toUpperCase().padStart(4, '0')}
                ) · Bit Position: {7 - (inspectedPixel.x % 8)}
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-neutral-500 pt-1">
              {result?.mode === 'vga_mode13h'
                ? 'VGA Mode 13h uses linear 8-bit framebuffer at 0A000h (1 byte per pixel).'
                : 'Select EGA Mode 0Dh to inspect 4-plane bit assignments.'}
            </div>
          )}
        </div>
      </div>

      {/* Palette Color Swatches */}
      {result && result.palette && (
        <div className="pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-300">
              Active Hardware Palette ({result.palette.length <= 16 ? `${result.palette.length} Colors (EGA)` : '256 Colors (VGA)'})
            </span>
            {highlightColorIndex !== null && (
              <button
                onClick={() => setHighlightColorIndex(null)}
                className="text-[11px] text-amber-400 hover:underline"
              >
                Clear color isolation
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1">
            {result.palette.slice(0, 32).map((col) => {
              const count = colorCounts.get(col.index) || 0;
              const isSelected = highlightColorIndex === col.index;
              return (
                <button
                  key={col.index}
                  onClick={() => setHighlightColorIndex(isSelected ? null : col.index)}
                  title={`${col.name || `Color ${col.index}`}: ${count} pixels (Click to isolate)`}
                  className={`w-6 h-6 rounded-xs border transition-transform relative group ${
                    isSelected ? 'ring-2 ring-amber-400 scale-110 z-10' : 'border-neutral-700/80 hover:scale-105'
                  }`}
                  style={{ backgroundColor: col.hex }}
                >
                  <span className="sr-only">{col.name}</span>
                </button>
              );
            })}
            {result.palette.length > 32 && (
              <span className="text-[10px] text-neutral-500 self-center pl-1 font-mono">
                + {result.palette.length - 32} more colors
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
