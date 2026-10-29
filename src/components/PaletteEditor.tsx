import React, { useState, useMemo } from 'react';
import { RgbColor } from '../types/dos';
import {
  rgbToHex,
  hexToRgb,
  rgbToDac6Bit,
  dac6BitToRgb,
  clonePalette,
  RETRO_16_PRESETS,
  EGA_16_PALETTE,
} from '../utils/palettes';
import {
  Palette,
  RotateCcw,
  Sparkles,
  Zap,
  Code,
  Copy,
  Check,
  Eye,
  Sliders,
  Cpu,
} from 'lucide-react';

interface PaletteEditorProps {
  palette: RgbColor[];
  onPaletteChange: (newPalette: RgbColor[], immediateOnly?: boolean) => void;
  onResetToDefault: () => void;
  colorCounts: Map<number, number>;
  selectedColorIndex: number;
  onSelectColorIndex: (index: number) => void;
  autoReDither: boolean;
  onToggleAutoReDither: (v: boolean) => void;
  onTriggerReDither: () => void;
  highlightColorIndex: number | null;
  onToggleHighlightColor: (index: number | null) => void;
}

export const PaletteEditor: React.FC<PaletteEditorProps> = ({
  palette,
  onPaletteChange,
  onResetToDefault,
  colorCounts,
  selectedColorIndex,
  onSelectColorIndex,
  autoReDither,
  onToggleAutoReDither,
  onTriggerReDither,
  highlightColorIndex,
  onToggleHighlightColor,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'adjust' | 'presets' | 'code'>('adjust');

  // Ensure selected index is in 0..15
  const activeIndex = Math.min(15, Math.max(0, selectedColorIndex));
  const activeColor = palette[activeIndex] || EGA_16_PALETTE[activeIndex];

  // Current color's 6-bit DAC values
  const dacR = rgbToDac6Bit(activeColor.r);
  const dacG = rgbToDac6Bit(activeColor.g);
  const dacB = rgbToDac6Bit(activeColor.b);

  const updateActiveColor = (r: number, g: number, b: number) => {
    const clampedR = Math.min(255, Math.max(0, Math.round(r)));
    const clampedG = Math.min(255, Math.max(0, Math.round(g)));
    const clampedB = Math.min(255, Math.max(0, Math.round(b)));

    const nextPalette = clonePalette(palette);
    nextPalette[activeIndex] = {
      ...nextPalette[activeIndex],
      r: clampedR,
      g: clampedG,
      b: clampedB,
      hex: rgbToHex(clampedR, clampedG, clampedB),
    };

    onPaletteChange(nextPalette, !autoReDither);
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = hexToRgb(e.target.value);
    if (parsed) {
      updateActiveColor(parsed.r, parsed.g, parsed.b);
    }
  };

  const handleNativeColorPicker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = hexToRgb(e.target.value);
    if (parsed) {
      updateActiveColor(parsed.r, parsed.g, parsed.b);
    }
  };

  const handleDacChange = (channel: 'r' | 'g' | 'b', dacVal: number) => {
    const r = channel === 'r' ? dac6BitToRgb(dacVal) : activeColor.r;
    const g = channel === 'g' ? dac6BitToRgb(dacVal) : activeColor.g;
    const b = channel === 'b' ? dac6BitToRgb(dacVal) : activeColor.b;
    updateActiveColor(r, g, b);
  };

  const handleApplyPreset = (presetColors: RgbColor[]) => {
    const next = presetColors.map((c, i) => ({
      index: i,
      r: c.r,
      g: c.g,
      b: c.b,
      hex: c.hex || rgbToHex(c.r, c.g, c.b),
      name: c.name || `Color ${i}`,
    }));
    onPaletteChange(next, false);
  };

  // Generate QBasic PALETTE code snippet
  const qbasicPaletteCode = useMemo(() => {
    const lines = [
      `' QBasic Custom VGA DAC Palette Assignment (Ports &H3C8 / &H3C9)`,
      `' Set 16 EGA colors to custom 6-bit DAC RGB values (0..63)`,
      `FOR I% = 0 TO 15`,
      `    READ R%, G%, B%`,
      `    OUT &H3C8, I%       ' DAC Palette Write Index`,
      `    OUT &H3C9, R%       ' Red   (0..63)`,
      `    OUT &H3C9, G%       ' Green (0..63)`,
      `    OUT &H3C9, B%       ' Blue  (0..63)`,
      `NEXT I%`,
      ``,
      `' DATA R, G, B for attributes 0 to 15:`,
    ];

    for (let i = 0; i < 16; i += 4) {
      const dataChunk: string[] = [];
      for (let j = 0; j < 4; j++) {
        const idx = i + j;
        const c = palette[idx] || EGA_16_PALETTE[idx];
        dataChunk.push(`${rgbToDac6Bit(c.r)}, ${rgbToDac6Bit(c.g)}, ${rgbToDac6Bit(c.b)}`);
      }
      lines.push(`DATA ${dataChunk.join(', ')}  ' Colors ${i}..${i + 3}`);
    }

    return lines.join('\n');
  }, [palette]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(qbasicPaletteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            16-Color EGA/VGA Palette Editor
          </h2>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs font-mono text-amber-400 font-medium">
            Real-Time Hardware DAC
          </span>
        </div>

        {/* Tab Controls & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('adjust')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'adjust'
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Color Adjuster
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'presets'
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Retro Presets
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'code'
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              QBasic Code
            </button>
          </div>

          <button
            onClick={onResetToDefault}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
            title="Reset palette to factory IBM EGA standard 16 colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset EGA</span>
          </button>
        </div>
      </div>

      {/* 16-Color Swatch Grid */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium text-neutral-300">
            Hardware Color Registers (0..15) — Select to Edit
          </span>
          <span className="text-[11px] font-mono">
            Active: Index {activeIndex} ({activeColor.name || `Color ${activeIndex}`})
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-1.5">
          {palette.slice(0, 16).map((col, idx) => {
            const isSelected = activeIndex === idx;
            const isHighlighted = highlightColorIndex === idx;
            const count = colorCounts.get(idx) || 0;

            return (
              <button
                key={idx}
                onClick={() => onSelectColorIndex(idx)}
                className={`relative group rounded border p-1 flex flex-col items-center justify-between min-h-[58px] transition-all text-left ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/50 bg-neutral-800/90 shadow-md'
                    : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700 hover:bg-neutral-800/40'
                }`}
              >
                {/* Color Swatch Block */}
                <div
                  className="w-full h-6 rounded-xs border border-black/40 shadow-inner mb-1"
                  style={{ backgroundColor: col.hex || rgbToHex(col.r, col.g, col.b) }}
                />

                {/* Index & Pixel Count */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono leading-none">
                  <span className={`font-bold ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`}>
                    #{idx}
                  </span>
                  <span className="text-neutral-500 tabular-nums text-[9px]">
                    {count > 999 ? `${Math.round(count / 1000)}k` : count}
                  </span>
                </div>

                {/* Quick Highlight toggle on hover */}
                {count > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHighlightColor(isHighlighted ? null : idx);
                    }}
                    title="Isolate this color on CRT monitor"
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] transition-opacity ${
                      isHighlighted
                        ? 'bg-amber-400 text-neutral-950 font-bold opacity-100 ring-1 ring-neutral-950'
                        : 'bg-neutral-800 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-neutral-100'
                    }`}
                  >
                    <Eye className="w-2.5 h-2.5" />
                  </button>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: Color Adjuster */}
      {activeTab === 'adjust' && (
        <div className="bg-neutral-950/80 p-3.5 rounded-lg border border-neutral-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/60 pb-3">
            {/* Active Color Details */}
            <div className="flex items-center gap-3">
              <label className="relative cursor-pointer group">
                <input
                  type="color"
                  value={activeColor.hex || rgbToHex(activeColor.r, activeColor.g, activeColor.b)}
                  onChange={handleNativeColorPicker}
                  className="sr-only"
                />
                <div
                  className="w-10 h-10 rounded border-2 border-neutral-700 group-hover:border-amber-400 shadow-md transition-colors"
                  style={{ backgroundColor: activeColor.hex || rgbToHex(activeColor.r, activeColor.g, activeColor.b) }}
                  title="Click to open system color picker"
                />
              </label>

              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-neutral-200">
                    Register #{activeIndex}: {activeColor.name || `Color ${activeIndex}`}
                  </span>
                  <span className="font-mono text-amber-400 text-xs font-bold">
                    {activeColor.hex || rgbToHex(activeColor.r, activeColor.g, activeColor.b)}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
                  8-Bit RGB({activeColor.r}, {activeColor.g}, {activeColor.b}) · 6-Bit DAC({dacR}, {dacG}, {dacB})
                </div>
              </div>
            </div>

            {/* Direct Hex Input */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-neutral-400 font-mono">Hex:</span>
              <input
                type="text"
                value={activeColor.hex || rgbToHex(activeColor.r, activeColor.g, activeColor.b)}
                onChange={handleHexChange}
                maxLength={7}
                className="w-24 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500 uppercase"
              />
            </div>
          </div>

          {/* Sliders Grid: 8-Bit RGB & 6-Bit DAC */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 8-Bit Standard RGB (0-255) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-neutral-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>8-Bit RGB Controls (0..255)</span>
                </span>
                <span className="text-[10px] text-neutral-500">Standard Display</span>
              </div>

              {/* Red */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-rose-400 font-medium">Red</span>
                  <span className="text-neutral-200 tabular-nums">{activeColor.r}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={activeColor.r}
                  onChange={(e) => updateActiveColor(parseInt(e.target.value), activeColor.g, activeColor.b)}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>

              {/* Green */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-emerald-400 font-medium">Green</span>
                  <span className="text-neutral-200 tabular-nums">{activeColor.g}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={activeColor.g}
                  onChange={(e) => updateActiveColor(activeColor.r, parseInt(e.target.value), activeColor.b)}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              {/* Blue */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-blue-400 font-medium">Blue</span>
                  <span className="text-neutral-200 tabular-nums">{activeColor.b}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={activeColor.b}
                  onChange={(e) => updateActiveColor(activeColor.r, activeColor.g, parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            {/* Hardware 6-Bit VGA DAC Registers (0-63) */}
            <div className="space-y-2.5 bg-neutral-900/60 p-2.5 rounded border border-neutral-800/70">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-amber-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span>VGA Hardware DAC Port 03C9h (0..63)</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-500">Real Hardware</span>
              </div>

              {/* DAC Red */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-rose-400">DAC Red</span>
                  <span className="text-amber-300 font-bold tabular-nums">{dacR}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="63"
                  value={dacR}
                  onChange={(e) => handleDacChange('r', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* DAC Green */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-emerald-400">DAC Green</span>
                  <span className="text-amber-300 font-bold tabular-nums">{dacG}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="63"
                  value={dacG}
                  onChange={(e) => handleDacChange('g', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* DAC Blue */}
              <div>
                <div className="flex justify-between text-[11px] mb-1 font-mono">
                  <span className="text-blue-400">DAC Blue</span>
                  <span className="text-amber-300 font-bold tabular-nums">{dacB}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="63"
                  value={dacB}
                  onChange={(e) => handleDacChange('b', parseInt(e.target.value))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Real-Time DAC Swap vs Re-Dither Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-300">
                <input
                  type="checkbox"
                  checked={autoReDither}
                  onChange={(e) => onToggleAutoReDither(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-0"
                />
                <span>Auto Re-dither on Palette Change</span>
              </label>
              <span className="text-[11px] text-neutral-500 hidden sm:inline">
                {autoReDither
                  ? '(Re-diffuses error across new colors)'
                  : '(Instant 60fps hardware DAC swap)'}
              </span>
            </div>

            <button
              onClick={onTriggerReDither}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-amber-500 text-neutral-950 hover:bg-amber-400 transition-colors shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Re-Dither to Custom Palette</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Retro Presets */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {RETRO_16_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleApplyPreset(preset.colors)}
              className="p-3 rounded border border-neutral-800 bg-neutral-950/60 hover:border-amber-500/60 hover:bg-neutral-800/40 text-left transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="font-semibold text-xs text-neutral-200 group-hover:text-amber-300 flex items-center justify-between mb-1">
                  <span>{preset.name}</span>
                  <Sparkles className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-[11px] text-neutral-400 leading-snug mb-2">
                  {preset.description}
                </p>
              </div>

              {/* Mini Color Strip */}
              <div className="grid grid-cols-16 gap-0.5 w-full h-4 rounded overflow-hidden border border-neutral-800">
                {preset.colors.map((c, i) => (
                  <div
                    key={i}
                    className="h-full w-full"
                    style={{ backgroundColor: c.hex || rgbToHex(c.r, c.g, c.b) }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Tab 3: QBasic & Assembly Palette Code */}
      {activeTab === 'code' && (
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-neutral-400">
              Paste this block into your QBasic or QuickBASIC program to program the custom palette registers:
            </span>
            <button
              onClick={handleCopyCode}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors"
            >
              {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
          <pre className="bg-neutral-950 p-4 rounded border border-neutral-800 font-mono text-[11px] text-amber-300/90 overflow-x-auto max-h-[260px] leading-relaxed">
            {qbasicPaletteCode}
          </pre>
        </div>
      )}
    </div>
  );
};
