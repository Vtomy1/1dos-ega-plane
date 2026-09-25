import React, { useState } from 'react';
import { QBasicCodeSamples } from '../utils/qbasicGenerator';
import { Code, Download, Copy, Check, Terminal, Cpu, BookOpen, Layers } from 'lucide-react';

interface QBasicCodeViewerProps {
  samples: QBasicCodeSamples;
  onDownloadBas: (code: string, fileName: string) => void;
  onDownloadEga: () => void;
  egaFileSize?: number;
}

export const QBasicCodeViewer: React.FC<QBasicCodeViewerProps> = ({
  samples,
  onDownloadBas,
  onDownloadEga,
  egaFileSize = 32000,
}) => {
  const [activeSnippet, setActiveSnippet] = useState<'loader' | 'saver' | 'bload' | 'docs'>('loader');
  const [copiedState, setCopiedState] = useState(false);

  const getCurrentCode = () => {
    switch (activeSnippet) {
      case 'loader':
        return samples.openBinaryLoader;
      case 'saver':
        return samples.openBinarySaver;
      case 'bload':
        return samples.bloadLoader;
      default:
        return samples.openBinaryLoader;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode());
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  const handleDownload = () => {
    const code = getCurrentCode();
    const name =
      activeSnippet === 'loader'
        ? 'EGA_LOAD.BAS'
        : activeSnippet === 'saver'
        ? 'EGA_SAVE.BAS'
        : 'BLOAD_EX.BAS';
    onDownloadBas(code, name);
  };

  return (
    <div id="qbasic-section" className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            QBasic EGA 4-Plane Binary Loader & Saver
          </h2>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs font-mono text-neutral-400">
            SCREEN 7 · 32,000 bytes
          </span>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setActiveSnippet('loader')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSnippet === 'loader' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Binary Loader
            </button>
            <button
              onClick={() => setActiveSnippet('saver')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSnippet === 'saver' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Binary Saver
            </button>
            <button
              onClick={() => setActiveSnippet('bload')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSnippet === 'bload' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              BLOAD / BSAVE
            </button>
            <button
              onClick={() => setActiveSnippet('docs')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeSnippet === 'docs' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Hardware Guide
            </button>
          </div>

          {activeSnippet !== 'docs' && (
            <>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 transition-colors"
              >
                {copiedState ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedState ? 'Copied' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save .BAS</span>
              </button>
            </>
          )}

          <button
            onClick={onDownloadEga}
            className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.EGA Binary ({Math.round(egaFileSize / 1024)} KB)</span>
          </button>
        </div>
      </div>

      {/* Code Viewer */}
      {activeSnippet !== 'docs' ? (
        <div className="relative">
          <pre className="bg-neutral-950 p-4 rounded border border-neutral-800 font-mono text-[11px] text-amber-200/90 overflow-x-auto max-h-[380px] leading-relaxed">
            {getCurrentCode()}
          </pre>
        </div>
      ) : (
        /* Architecture Documentation */
        <div className="space-y-4 text-xs text-neutral-300 bg-neutral-950 p-4 rounded border border-neutral-800">
          <div className="flex items-center gap-2 font-semibold text-neutral-100 text-sm">
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>How EGA 4-Plane Bitmapped Graphics Work in MS-DOS Video Memory</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 bg-neutral-900/60 p-3 rounded border border-neutral-800">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>1. Memory Geometry (SCREEN 7)</span>
              </div>
              <p className="text-neutral-400 leading-relaxed">
                In EGA Mode 0Dh (320x200 16-color), all 4 bitplanes share the identical memory segment at <code className="font-mono text-amber-300">&HA000:0000</code>.
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400 font-mono text-[11px]">
                <li>Resolution: 320 horizontal x 200 vertical scanlines</li>
                <li>Bytes per line: 320 / 8 = 40 bytes</li>
                <li>Bytes per plane: 40 * 200 = 8,000 bytes (&H1F40)</li>
                <li>Total 4 Planes: 8,000 * 4 = 32,000 bytes (&H7D00)</li>
                <li>Plane 0: Blue component (bit 0)</li>
                <li>Plane 1: Green component (bit 1)</li>
                <li>Plane 2: Red component (bit 2)</li>
                <li>Plane 3: Intensity component (bit 3)</li>
              </ul>
            </div>

            <div className="space-y-2 bg-neutral-900/60 p-3 rounded border border-neutral-800">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                <span>2. Hardware Registers (I/O Ports)</span>
              </div>
              <p className="text-neutral-400 leading-relaxed">
                Because all 4 planes occupy the exact same physical CPU address space (<code className="font-mono text-amber-300">&HA000</code>), you must tell the EGA Sequencer and Graphics Controller which plane to write or read:
              </p>
              <div className="space-y-1.5 font-mono text-[11px] text-neutral-400">
                <div className="p-1.5 bg-neutral-950 rounded border border-neutral-800">
                  <span className="text-amber-400 font-bold">Write Mask (Sequencer):</span>
                  <br />
                  <code className="text-neutral-300">OUT &H3C4, 2</code> (Select Map Mask Register)
                  <br />
                  <code className="text-neutral-300">OUT &H3C5, 2 ^ Plane</code> (1=P0, 2=P1, 4=P2, 8=P3)
                </div>
                <div className="p-1.5 bg-neutral-950 rounded border border-neutral-800">
                  <span className="text-amber-400 font-bold">Read Map (Graphics Controller):</span>
                  <br />
                  <code className="text-neutral-300">OUT &H3CE, 4</code> (Select Read Map Register)
                  <br />
                  <code className="text-neutral-300">OUT &H3CF, Plane</code> (0..3)
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded text-[11px] text-amber-200 leading-relaxed">
            <strong>Running in DOSBox / QBasic:</strong> Copy both <code className="font-mono text-amber-300">LOADER.BAS</code> and <code className="font-mono text-amber-300">IMAGE.EGA</code> into your DOS directory. Start QBasic with <code className="font-mono text-amber-300">qbasic /run LOADER.BAS</code>. The image loads in SCREEN 7 directly into Video RAM!
          </div>
        </div>
      )}
    </div>
  );
};
