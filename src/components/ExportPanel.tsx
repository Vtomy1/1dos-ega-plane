import React from 'react';
import { ConversionResult } from '../types/dos';
import { Download, FileCode, Binary, Monitor, Layers } from 'lucide-react';
import { downloadBinaryFile, downloadTextFile, generateCHeader } from '../utils/fileDownloader';
import { generateQBasicCodeSamples } from '../utils/qbasicGenerator';

interface ExportPanelProps {
  result: ConversionResult | null;
  baseFileName: string;
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ result, baseFileName }) => {
  const cleanName = (baseFileName || 'IMAGE').replace(/\.[^/.]+$/, '').toUpperCase();

  if (!result) return null;

  const isEga = result.mode === 'ega_screen7' || result.mode === 'ega_screen9';

  // Handlers
  const handleDownloadExe = () => {
    downloadBinaryFile(result.exeBuffer, `${cleanName}.EXE`);
  };

  const handleDownloadCom = () => {
    downloadBinaryFile(result.comBuffer, `${cleanName}.COM`);
  };

  const handleDownloadEga = () => {
    if (result.egaPlanes) {
      downloadBinaryFile(result.egaPlanes.combined, `${cleanName}.EGA`);
    } else {
      downloadBinaryFile(result.colorIndices, `${cleanName}.BIN`);
    }
  };

  const handleDownloadBsv = () => {
    if (result.bsaveBuffer) {
      downloadBinaryFile(result.bsaveBuffer, `${cleanName}.BSV`);
    }
  };

  const handleDownloadLoaderBas = () => {
    const samples = generateQBasicCodeSamples(`${cleanName}.EGA`);
    downloadTextFile(samples.openBinaryLoader, `${cleanName}_LOAD.BAS`);
  };

  const handleDownloadSaverBas = () => {
    const samples = generateQBasicCodeSamples(`${cleanName}.EGA`);
    downloadTextFile(samples.openBinarySaver, `${cleanName}_SAVE.BAS`);
  };

  const handleDownloadCHeader = () => {
    const dataToUse = result.egaPlanes ? result.egaPlanes.combined : result.colorIndices;
    const headerCode = generateCHeader(dataToUse, `${cleanName}_DATA`, isEga);
    downloadTextFile(headerCode, `${cleanName}.H`);
  };

  const handleDownloadPng = () => {
    const canvas = document.createElement('canvas');
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = new ImageData(new Uint8ClampedArray(result.rgbPixels), result.width, result.height);
    ctx.putImageData(imgData, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cleanName}_320x200.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const exportItems = [
    {
      title: 'MS-DOS MZ Executable (.EXE)',
      file: `${cleanName}.EXE`,
      size: `${(result.exeBuffer.length / 1024).toFixed(1)} KB`,
      desc: 'Authentic 64-byte MZ header + x86 Real-Mode machine code payload.',
      target: 'DOSBox, FreeDOS, MS-DOS 3.3-6.22, 8086-Pentium',
      action: handleDownloadExe,
      primary: true,
      badge: 'STANDALONE',
    },
    {
      title: 'MS-DOS COM Flat Binary (.COM)',
      file: `${cleanName}.COM`,
      size: `${(result.comBuffer.length / 1024).toFixed(1)} KB`,
      desc: 'Tiny 16-bit binary starting at CS:0100h with immediate execution.',
      target: 'MS-DOS prompt (instant run)',
      action: handleDownloadCom,
      primary: false,
    },
    {
      title: isEga ? 'EGA 4-Plane Binary File (.EGA)' : 'VGA 8-bit Raw Binary (.BIN)',
      file: isEga ? `${cleanName}.EGA` : `${cleanName}.BIN`,
      size: isEga ? '32,000 bytes' : '64,000 bytes',
      desc: isEga
        ? '4 Bitplanes (Blue, Green, Red, Intensity) x 8,000 bytes each.'
        : '64,000 linear bytes (1 byte per pixel for A000:0000).',
      target: 'QBasic OPEN FOR BINARY / Game Engines',
      action: handleDownloadEga,
      primary: true,
      badge: 'REQUESTED',
    },
    {
      title: 'QBasic BLOAD Image File (.BSV)',
      file: `${cleanName}.BSV`,
      size: `${((result.bsaveBuffer?.length || 32007) / 1024).toFixed(1)} KB`,
      desc: 'BSAVE format with 0xFD magic byte, segment &HA000, offset 0.',
      target: 'QBasic 1.1 / QuickBASIC 4.5 BLOAD statement',
      action: handleDownloadBsv,
      primary: false,
    },
    {
      title: 'QBasic EGA 4-Plane Loader (.BAS)',
      file: `${cleanName}_LOAD.BAS`,
      size: '1.5 KB',
      desc: 'Loads .EGA file directly to video RAM using Sequencer Map Mask.',
      target: 'QBasic 1.1, QuickBASIC 4.5, QB64',
      action: handleDownloadLoaderBas,
      primary: false,
    },
    {
      title: 'QBasic EGA 4-Plane Saver (.BAS)',
      file: `${cleanName}_SAVE.BAS`,
      size: '1.4 KB',
      desc: 'Reads screen memory using Graphics Controller Read Map & saves .EGA.',
      target: 'QBasic 1.1, QuickBASIC 4.5, QB64',
      action: handleDownloadSaverBas,
      primary: false,
    },
    {
      title: 'C/C++ Header Array (.H)',
      file: `${cleanName}.H`,
      size: '~180 KB',
      desc: 'Static const unsigned char array for Watcom C, Borland Turbo C, Open Watcom.',
      target: 'Turbo C / C++ 3.0 / Watcom C 11.0 / DJGPP',
      action: handleDownloadCHeader,
      primary: false,
    },
    {
      title: 'Dithered PNG Pixel Art (320x200)',
      file: `${cleanName}_320x200.PNG`,
      size: '~15 KB',
      desc: 'Lossless 320x200 pixel art export for modern art tools and engines.',
      target: 'Aseprite, Photoshop, Game Engines',
      action: handleDownloadPng,
      primary: false,
    },
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            Export Center & Binary Deliverables
          </h2>
        </div>
        <span className="text-xs text-neutral-400 font-mono">
          Ready for DOSBox, QBasic & Vintage PC Hardware
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {exportItems.map((item, idx) => (
          <div
            key={idx}
            className={`p-3 rounded border flex flex-col justify-between transition-all ${
              item.primary
                ? 'border-amber-500/40 bg-neutral-950/70 hover:border-amber-500/60'
                : 'border-neutral-800 bg-neutral-950/40 hover:border-neutral-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-semibold text-xs text-neutral-200 truncate flex items-center gap-1.5">
                  <span>{item.title}</span>
                </span>
                {item.badge && (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold shrink-0">
                    {item.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 leading-snug mb-2">
                {item.desc}
              </p>
              <div className="text-[10px] font-mono text-neutral-500 flex items-center justify-between mb-3 border-t border-neutral-900 pt-1.5">
                <span>File: <strong className="text-neutral-300">{item.file}</strong></span>
                <span>Size: <strong className="text-amber-400 tabular-nums">{item.size}</strong></span>
              </div>
            </div>

            <button
              onClick={item.action}
              className={`w-full py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                item.primary
                  ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold shadow-xs'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {item.file}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
