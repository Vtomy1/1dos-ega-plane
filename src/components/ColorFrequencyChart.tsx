import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import { RgbColor } from '../types/dos';
import { BarChart3, Eye, Info } from 'lucide-react';
import { rgbToHex } from '../utils/palettes';

interface ColorFrequencyChartProps {
  palette: RgbColor[];
  colorCounts: Map<number, number>;
  totalPixels?: number; // default 64000
  selectedColorIndex: number;
  onSelectColorIndex: (index: number) => void;
  highlightColorIndex: number | null;
  onToggleHighlightColor: (index: number | null) => void;
}

export const ColorFrequencyChart: React.FC<ColorFrequencyChartProps> = ({
  palette,
  colorCounts,
  totalPixels = 64000,
  selectedColorIndex,
  onSelectColorIndex,
  highlightColorIndex,
  onToggleHighlightColor,
}) => {
  // Build chart dataset for indices 0..15
  const data = Array.from({ length: 16 }, (_, idx) => {
    const col = palette[idx] || { index: idx, r: 0, g: 0, b: 0, hex: '#000000', name: `Color ${idx}` };
    const count = colorCounts.get(idx) || 0;
    const percentage = ((count / totalPixels) * 100).toFixed(1);
    const hex = col.hex || rgbToHex(col.r, col.g, col.b);

    return {
      index: idx,
      name: col.name || `Idx ${idx}`,
      count,
      percentage,
      hex,
      r: col.r,
      g: col.g,
      b: col.b,
    };
  });

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-neutral-900 border border-neutral-700 p-2.5 rounded shadow-xl text-xs font-mono space-y-1">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-xs border border-white/30 inline-block shadow-xs"
              style={{ backgroundColor: item.hex }}
            />
            <span className="font-bold text-neutral-100">
              #{item.index}: {item.name}
            </span>
          </div>
          <div className="text-amber-400 font-semibold">
            {item.count.toLocaleString()} pixels ({item.percentage}%)
          </div>
          <div className="text-[10px] text-neutral-400">
            Hex: {item.hex} · RGB({item.r}, {item.g}, {item.b})
          </div>
          <div className="text-[10px] text-neutral-500 italic pt-0.5 border-t border-neutral-800">
            Click bar to select index in editor
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-neutral-950/70 p-3 rounded-lg border border-neutral-800 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-neutral-200">
            16-Color Usage Frequency (Recharts Distribution)
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-neutral-400 font-mono">
          <span>Total: <strong>{totalPixels.toLocaleString()}</strong> px</span>
          <span>·</span>
          <span>Max: <strong className="text-amber-400">{maxCount.toLocaleString()}</strong> px</span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 10, left: -20, bottom: 4 }}
            onClick={(state) => {
              if (state && state.activeTooltipIndex !== undefined) {
                const idx = Number(state.activeTooltipIndex);
                if (!isNaN(idx)) onSelectColorIndex(idx);
              }
            }}
          >
            <XAxis
              dataKey="index"
              stroke="#525252"
              tick={{ fill: '#a3a3a3', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
              tickFormatter={(val) => `#${val}`}
            />
            <YAxis
              stroke="#525252"
              tick={{ fill: '#737373', fontSize: 9, fontFamily: 'IBM Plex Mono' }}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="count"
              radius={[2, 2, 0, 0]}
              cursor="pointer"
            >
              {data.map((entry) => {
                const isSelected = selectedColorIndex === entry.index;
                const isHighlighted = highlightColorIndex === entry.index;
                return (
                  <Cell
                    key={`cell-${entry.index}`}
                    fill={entry.hex}
                    stroke={
                      isSelected
                        ? '#fbbf24' // Amber-400 for selected
                        : isHighlighted
                        ? '#38bdf8' // Sky-400 for highlighted
                        : '#262626'
                    }
                    strokeWidth={isSelected || isHighlighted ? 2 : 1}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-800/80">
        <span>Click any bar to select that hardware color register for editing</span>
        {highlightColorIndex !== null && (
          <button
            onClick={() => onToggleHighlightColor(null)}
            className="text-amber-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
          >
            <Eye className="w-3 h-3" />
            <span>Clear isolation</span>
          </button>
        )}
      </div>
    </div>
  );
};
