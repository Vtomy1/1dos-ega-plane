import React from 'react';
import { AspectRatioMode, DitherAlgorithm, GraphicMode } from '../types/dos';
import { Sliders, Monitor, Layers, Sparkles, RefreshCw } from 'lucide-react';

interface ConversionControlsProps {
  mode: GraphicMode;
  onModeChange: (mode: GraphicMode) => void;
  dither: DitherAlgorithm;
  onDitherChange: (dither: DitherAlgorithm) => void;
  strength: number;
  onStrengthChange: (strength: number) => void;
  brightness: number;
  onBrightnessChange: (v: number) => void;
  contrast: number;
  onContrastChange: (v: number) => void;
  gamma: number;
  onGammaChange: (v: number) => void;
  aspectMode: AspectRatioMode;
  onAspectModeChange: (mode: AspectRatioMode) => void;
  serpentine: boolean;
  onSerpentineChange: (val: boolean) => void;
  onResetAdjustments: () => void;
}

export const ConversionControls: React.FC<ConversionControlsProps> = ({
  mode,
  onModeChange,
  dither,
  onDitherChange,
  strength,
  onStrengthChange,
  brightness,
  onBrightnessChange,
  contrast,
  onContrastChange,
  gamma,
  onGammaChange,
  aspectMode,
  onAspectModeChange,
  serpentine,
  onSerpentineChange,
  onResetAdjustments,
}) => {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* 1. Graphic Mode Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-amber-400" />
            <span>MS-DOS Graphics Architecture</span>
          </label>
          <span className="text-[11px] font-mono text-neutral-400">
            {mode === 'ega_screen7' ? '320x200 · 16 colors · 4 planes (32 KB)' : '320x200 · 256 colors · Linear (64 KB)'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => onModeChange('ega_screen7')}
            className={`p-2 rounded text-left border transition-all ${
              mode === 'ega_screen7'
                ? 'border-amber-500 bg-amber-500/10 text-neutral-100 ring-1 ring-amber-500/40'
                : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
            }`}
          >
            <div className="font-semibold text-xs flex items-center justify-between">
              <span>EGA Mode 0Dh</span>
              <span className="text-[10px] font-mono bg-amber-400/20 text-amber-300 px-1 rounded">SCREEN 7</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
              16 Colors · 4-Plane Bitmapped · 32,000 bytes
            </div>
          </button>

          <button
            onClick={() => onModeChange('vga_mode13h')}
            className={`p-2 rounded text-left border transition-all ${
              mode === 'vga_mode13h'
                ? 'border-amber-500 bg-amber-500/10 text-neutral-100 ring-1 ring-amber-500/40'
                : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
            }`}
          >
            <div className="font-semibold text-xs flex items-center justify-between">
              <span>VGA Mode 13h</span>
              <span className="text-[10px] font-mono bg-blue-400/20 text-blue-300 px-1 rounded">SCREEN 13</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
              256 Colors (8-bit) · Linear A000h · 64,000 bytes
            </div>
          </button>

          <button
            onClick={() => onModeChange('cga_mode4')}
            className={`p-2 rounded text-left border transition-all ${
              mode === 'cga_mode4'
                ? 'border-amber-500 bg-amber-500/10 text-neutral-100 ring-1 ring-amber-500/40'
                : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
            }`}
          >
            <div className="font-semibold text-xs flex items-center justify-between">
              <span>CGA Mode 04h</span>
              <span className="text-[10px] font-mono bg-purple-400/20 text-purple-300 px-1 rounded">SCREEN 1</span>
            </div>
            <div className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
              4 Colors (Cyan/Magenta) · Interleaved
            </div>
          </button>
        </div>
      </div>

      {/* 2. Dithering Algorithm Selection */}
      <div>
        <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5 mb-2">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Dithering Algorithm</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
          {[
            { id: 'floyd_steinberg', label: 'Floyd-Steinberg' },
            { id: 'atkinson', label: 'Atkinson' },
            { id: 'bayer_4x4', label: 'Bayer 4x4' },
            { id: 'bayer_8x8', label: 'Bayer 8x8' },
            { id: 'sierra_lite', label: 'Sierra Lite' },
            { id: 'burkes', label: 'Burkes' },
            { id: 'nearest', label: 'No Dither' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => onDitherChange(item.id as DitherAlgorithm)}
              className={`px-2 py-1.5 rounded text-xs font-medium text-center transition-colors truncate ${
                dither === item.id
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'bg-neutral-950/80 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Dither Strength & Serpentine Toggle */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-neutral-800/80">
        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-neutral-400">Dither Diffusion Strength</span>
            <span className="font-mono text-amber-400 tabular-nums">{Math.round(strength * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={strength}
            onChange={(e) => onStrengthChange(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs text-neutral-300 font-medium">Serpentine Scan</div>
            <div className="text-[11px] text-neutral-500">Alternating row direction removes directional bias</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={serpentine}
              onChange={(e) => onSerpentineChange(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      {/* 4. Aspect Ratio & Preprocessing Adjustments */}
      <div className="pt-2 border-t border-neutral-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Aspect Scaling & Color Tuning</span>
          </div>
          <button
            onClick={onResetAdjustments}
            className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Tuning</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Aspect Mode */}
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">Canvas Fitting</label>
            <select
              value={aspectMode}
              onChange={(e) => onAspectModeChange(e.target.value as AspectRatioMode)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
            >
              <option value="fit_letterbox">Fit (Letterbox 320x200)</option>
              <option value="crop_fill">Crop & Fill 320x200</option>
              <option value="stretch_320x200">Stretch to 320x200</option>
            </select>
          </div>

          {/* Brightness */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Brightness</span>
              <span className="font-mono tabular-nums">{brightness > 0 ? `+${brightness}` : brightness}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={brightness}
              onChange={(e) => onBrightnessChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Contrast</span>
              <span className="font-mono tabular-nums">{contrast > 0 ? `+${contrast}` : contrast}</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={contrast}
              onChange={(e) => onContrastChange(parseInt(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Gamma */}
          <div>
            <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
              <span>Gamma</span>
              <span className="font-mono tabular-nums">{gamma.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={gamma}
              onChange={(e) => onGammaChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
