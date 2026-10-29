import React, { useState, useMemo, useEffect } from 'react';
import { RgbColor } from '../types/dos';
import {
  rgbToHex,
  hexToRgb,
  rgbToDac6Bit,
  dac6BitToRgb,
  clonePalette,
  CATEGORIZED_PALETTES,
  CategorizedPreset,
  loadUserCustomPalettes,
  saveUserCustomPalette,
  deleteUserCustomPalette,
  EGA_16_PALETTE,
} from '../utils/palettes';
import { ColorFrequencyChart } from './ColorFrequencyChart';
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
  ArrowLeftRight,
  Save,
  Trash2,
  FolderOpen,
  BarChart3,
  Download,
  Upload,
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
  const [activeTab, setActiveTab] = useState<'adjust' | 'chart' | 'code'>('adjust');

  // Custom User Palettes state from localStorage
  const [userCustomPalettes, setUserCustomPalettes] = useState<CategorizedPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('ega_standard');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPaletteName, setNewPaletteName] = useState('');

  // Load user custom palettes on mount
  useEffect(() => {
    setUserCustomPalettes(loadUserCustomPalettes());
  }, []);

  // Ensure selected index is valid 0..15
  const activeIndex = Math.min(15, Math.max(0, selectedColorIndex));
  const activeColor = palette[activeIndex] || EGA_16_PALETTE[activeIndex];

  // 6-bit DAC values
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

  // Quick swap feature: Swap colors between two palette indices
  const handleSwapIndices = (idxA: number, idxB: number) => {
    if (idxA === idxB) return;
    const nextPalette = clonePalette(palette);
    const temp = { ...nextPalette[idxA] };
    nextPalette[idxA] = {
      ...nextPalette[idxB],
      index: idxA,
    };
    nextPalette[idxB] = {
      ...temp,
      index: idxB,
    };

    onPaletteChange(nextPalette, !autoReDither);
  };

  // Handle dropdown selection between EGA, CGA, VGA, Hercules, and Custom
  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetId = e.target.value;
    setSelectedPresetId(presetId);

    // Look in built-in categorized presets
    const builtIn = CATEGORIZED_PALETTES.find((p) => p.id === presetId);
    if (builtIn) {
      applyPalettePreset(builtIn.colors);
      return;
    }

    // Look in user custom presets
    const custom = userCustomPalettes.find((p) => p.id === presetId);
    if (custom) {
      applyPalettePreset(custom.colors);
    }
  };

  const applyPalettePreset = (presetColors: RgbColor[]) => {
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

  // Save current palette to localStorage
  const handleSaveCustomPalette = () => {
    if (!newPaletteName.trim()) return;
    const saved = saveUserCustomPalette(newPaletteName, palette);
    const updated = loadUserCustomPalettes();
    setUserCustomPalettes(updated);
    setSelectedPresetId(saved.id);
    setSaveModalOpen(false);
    setNewPaletteName('');
  };

  // Delete current custom palette
  const handleDeleteCustomPalette = (id: string) => {
    const remaining = deleteUserCustomPalette(id);
    setUserCustomPalettes(remaining);
    setSelectedPresetId('ega_standard');
    onResetToDefault();
  };

  // Export custom palettes as JSON
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(palette, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PALETTE_${Date.now()}.JSON`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import custom palette JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.length >= 16) {
          applyPalettePreset(parsed.slice(0, 16));
        }
      } catch (err) {
        console.error('Failed to import JSON palette', err);
      }
    };
    reader.readAsText(file);
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

  const isCurrentCustom = selectedPresetId.startsWith('custom_');

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header with Title and Dropdown Menu */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            16-Color Palette Studio & Hardware DAC
          </h2>
        </div>

        {/* Dropdown Menu for CGA, VGA, Hercules, EGA & Custom */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded px-2 py-1">
            <span className="text-[11px] text-neutral-400 font-mono">Preset:</span>
            <select
              value={selectedPresetId}
              onChange={handleDropdownChange}
              className="bg-transparent text-xs text-neutral-200 focus:outline-none focus:text-amber-300 font-medium cursor-pointer"
            >
              <optgroup label="EGA (Enhanced Graphics Adapter)">
                {CATEGORIZED_PALETTES.filter((p) => p.category === 'EGA').map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-200">
                    {p.name}
                  </option>
                ))}
              </optgroup>

              <optgroup label="CGA (Color Graphics Adapter)">
                {CATEGORIZED_PALETTES.filter((p) => p.category === 'CGA').map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-200">
                    {p.name}
                  </option>
                ))}
              </optgroup>

              <optgroup label="VGA (Video Graphics Array)">
                {CATEGORIZED_PALETTES.filter((p) => p.category === 'VGA').map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-200">
                    {p.name}
                  </option>
                ))}
              </optgroup>

              <optgroup label="Hercules (Monochrome Graphics)">
                {CATEGORIZED_PALETTES.filter((p) => p.category === 'Hercules').map((p) => (
                  <option key={p.id} value={p.id} className="bg-neutral-900 text-neutral-200">
                    {p.name}
                  </option>
                ))}
              </optgroup>

              {userCustomPalettes.length > 0 && (
                <optgroup label="Custom User-Saved Palettes">
                  {userCustomPalettes.map((p) => (
                    <option key={p.id} value={p.id} className="bg-neutral-900 text-amber-300">
                      ★ {p.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Save Custom Palette button */}
          <button
            onClick={() => setSaveModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
            title="Save current 16 colors as a custom preset"
          >
            <Save className="w-3.5 h-3.5 text-amber-400" />
            <span>Save Custom</span>
          </button>

          {/* Delete custom preset if active */}
          {isCurrentCustom && (
            <button
              onClick={() => handleDeleteCustomPalette(selectedPresetId)}
              className="p-1 text-xs rounded bg-neutral-800 hover:bg-rose-900/50 text-rose-400 border border-neutral-700 transition-colors"
              title="Delete this custom preset"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reset button */}
          <button
            onClick={onResetToDefault}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-neutral-200 border border-neutral-700 transition-colors"
            title="Reset to factory IBM EGA standard 16 colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Save Modal Inline Input */}
      {saveModalOpen && (
        <div className="bg-neutral-950 p-3 rounded border border-amber-500/40 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs font-semibold text-amber-400 shrink-0">Palette Name:</span>
            <input
              type="text"
              placeholder="e.g. My Dungeon Crawler Palette"
              value={newPaletteName}
              onChange={(e) => setNewPaletteName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveCustomPalette()}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-2.5 py-1 text-xs text-neutral-100 focus:outline-none focus:border-amber-400"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSaveCustomPalette}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold rounded text-xs transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setSaveModalOpen(false)}
              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 rounded text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 16-Color Swatch Grid with Quick Index Swapping */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-neutral-400">
          <span className="font-medium text-neutral-300">
            Hardware 16-Color Swatch Grid — Click to Select / Swap with Selected (Index #{activeIndex})
          </span>
          <span className="text-[11px] font-mono text-amber-400 font-semibold">
            Active: #{activeIndex} ({activeColor.name || `Color ${activeIndex}`})
          </span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-8 md:grid-cols-16 gap-1.5">
          {palette.slice(0, 16).map((col, idx) => {
            const isSelected = activeIndex === idx;
            const isHighlighted = highlightColorIndex === idx;
            const count = colorCounts.get(idx) || 0;
            const hex = col.hex || rgbToHex(col.r, col.g, col.b);

            return (
              <div
                key={idx}
                className={`relative group rounded border p-1 flex flex-col items-center justify-between min-h-[64px] transition-all text-left ${
                  isSelected
                    ? 'border-amber-400 ring-2 ring-amber-400/50 bg-neutral-800/90 shadow-md'
                    : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700 hover:bg-neutral-800/40'
                }`}
              >
                {/* Clickable Swatch Block (Changes Selected Index) */}
                <button
                  type="button"
                  onClick={() => onSelectColorIndex(idx)}
                  className="w-full h-7 rounded-xs border border-black/40 shadow-inner mb-1 cursor-pointer transition-transform hover:scale-105"
                  style={{ backgroundColor: hex }}
                  title={`Click to select Index #${idx}`}
                />

                {/* Index & Pixel Count Badge */}
                <div className="w-full flex items-center justify-between text-[10px] font-mono leading-none">
                  <span className={`font-bold ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`}>
                    #{idx}
                  </span>
                  <span className="text-neutral-500 tabular-nums text-[9px]">
                    {count > 999 ? `${Math.round(count / 1000)}k` : count}
                  </span>
                </div>

                {/* Quick Swap Button (Appears on non-selected swatches on hover) */}
                {!isSelected ? (
                  <button
                    type="button"
                    onClick={() => handleSwapIndices(activeIndex, idx)}
                    title={`Swap Color #${idx} with Selected Color #${activeIndex}`}
                    className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 opacity-0 group-hover:opacity-100 hover:bg-amber-500 hover:text-neutral-950 flex items-center justify-center transition-all shadow-sm z-10"
                  >
                    <ArrowLeftRight className="w-2.5 h-2.5" />
                  </button>
                ) : (
                  <div
                    className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm"
                    title="Active selected color"
                  />
                )}

                {/* Isolate/Highlight button */}
                {count > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleHighlightColor(isHighlighted ? null : idx);
                    }}
                    title="Isolate this color on CRT monitor"
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] transition-opacity z-10 ${
                      isHighlighted
                        ? 'bg-amber-400 text-neutral-950 font-bold opacity-100 ring-1 ring-neutral-950'
                        : 'bg-neutral-800 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-neutral-100'
                    }`}
                  >
                    <Eye className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs for Color Adjuster, Usage Frequency Chart, and QBasic Code */}
      <div className="flex items-center justify-between border-b border-neutral-800 pt-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('adjust')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'adjust'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Color & DAC Adjuster</span>
          </button>

          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'chart'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Usage Frequency Chart</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'code'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>QBasic DAC Code</span>
          </button>
        </div>

        {/* JSON Export & Import */}
        <div className="flex items-center gap-2 pb-1">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            title="Download palette as JSON"
          >
            <Download className="w-3 h-3" />
            <span>Export JSON</span>
          </button>

          <label className="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors cursor-pointer">
            <Upload className="w-3 h-3" />
            <span>Import JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportJson}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Tab 1: Color & DAC Adjuster */}
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

      {/* Tab 2: Color Usage Frequency Chart (Recharts) */}
      {activeTab === 'chart' && (
        <ColorFrequencyChart
          palette={palette}
          colorCounts={colorCounts}
          totalPixels={64000}
          selectedColorIndex={activeIndex}
          onSelectColorIndex={onSelectColorIndex}
          highlightColorIndex={highlightColorIndex}
          onToggleHighlightColor={onToggleHighlightColor}
        />
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
