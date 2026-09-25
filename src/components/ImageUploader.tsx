import React, { useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';

interface PresetItem {
  id: string;
  title: string;
  genre: string;
  path: string;
}

const RETRO_PRESETS: PresetItem[] = [
  {
    id: 'cyberpunk',
    title: 'Cyberpunk Skyline',
    genre: 'Synthwave / Sci-Fi',
    path: '/src/assets/images/dos_cyberpunk_city_1790301713205.jpg',
  },
  {
    id: 'spacemarine',
    title: 'Space Soldier 1993',
    genre: 'Retro Action Cover',
    path: '/src/assets/images/dos_space_marine_1790301724435.jpg',
  },
  {
    id: 'fantasy',
    title: 'Highland Citadel',
    genre: 'Sierra / LucasArts Style',
    path: '/src/assets/images/dos_fantasy_castle_1790301735690.jpg',
  },
];

interface ImageUploaderProps {
  onImageLoaded: (img: HTMLImageElement, name: string) => void;
  activePresetId?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageLoaded, activePresetId }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    loadFromFile(file);
  };

  const loadFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        onImageLoaded(img, file.name);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const loadPreset = (preset: PresetItem) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      onImageLoaded(img, `${preset.id}.png`);
    };
    img.src = preset.path;
  };

  // Support clipboard paste (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            loadFromFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      loadFromFile(file);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <div className="flex flex-col md:flex-row gap-4 items-stretch">
        {/* Upload Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 border-2 border-dashed border-neutral-700 hover:border-amber-500/60 rounded-md p-4 text-center cursor-pointer transition-colors bg-neutral-950/40 flex flex-col items-center justify-center min-h-[110px]"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Upload className="w-5 h-5 text-neutral-400 mb-1.5" />
          <div className="text-xs font-medium text-neutral-200">
            Drop image or <span className="text-amber-400 underline underline-offset-2">browse file</span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Supports PNG, JPG, WebP · Ctrl+V to paste from clipboard
          </div>
        </div>

        {/* Retro Samples Selector */}
        <div className="flex-1 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-2 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Preset Retro Source Images</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {RETRO_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset)}
                  className={`group relative text-left border rounded overflow-hidden transition-all text-xs p-1.5 flex flex-col items-start ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700'
                  }`}
                >
                  <div className="w-full aspect-video rounded overflow-hidden mb-1.5 bg-neutral-800">
                    <img
                      src={preset.path}
                      alt={preset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                  <span className="font-semibold text-neutral-200 truncate w-full text-[11px] leading-tight">
                    {preset.title}
                  </span>
                  <span className="text-[10px] text-neutral-500 truncate w-full">
                    {preset.genre}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
