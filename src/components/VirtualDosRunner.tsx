import React, { useState, useEffect, useRef } from 'react';
import { ConversionResult } from '../types/dos';
import { Play, RotateCcw, Terminal, ArrowRight, CornerDownLeft } from 'lucide-react';

interface VirtualDosRunnerProps {
  result: ConversionResult | null;
  fileName: string;
}

export const VirtualDosRunner: React.FC<VirtualDosRunnerProps> = ({ result, fileName }) => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [commandInput, setCommandInput] = useState<string>('IMAGE.EXE');
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Starting MS-DOS 6.22...',
    'HIMEM: DOS XMS Driver, Version 3.09',
    'C:\\DOS\\SMARTDRV.EXE /X',
    '',
    'C:\\RETRO> DIR',
    ' Volume in drive C is MS-DOS_622',
    ' Volume Serial Number is 1993-0622',
    ' Directory of C:\\RETRO',
    '',
    'IMAGE    EXE        32,544 09-24-93   4:20p',
    'IMAGE    EGA        32,000 09-24-93   4:20p',
    'LOADER   BAS         1,420 09-24-93   4:20p',
    '         3 file(s)         65,964 bytes',
    '                     14,845,952 bytes free',
    '',
    'C:\\RETRO> IMAGE.EXE',
  ]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const termEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal
  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  // When execution starts, render the image onto the virtual DOS graphics screen
  useEffect(() => {
    if (!isRunning || !result || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const imgData = new ImageData(new Uint8ClampedArray(result.rgbPixels), result.width, result.height);
    ctx.putImageData(imgData, 0, 0);
  }, [isRunning, result]);

  const handleRun = () => {
    if (!result) return;
    setIsRunning(true);
  };

  const handleExitGraphics = () => {
    setIsRunning(false);
    setConsoleLogs((prev) => [
      ...prev,
      'Returning to MS-DOS text mode (Mode 03h: 80x25)...',
      'C:\\RETRO> ',
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isRunning) {
      handleExitGraphics();
      return;
    }
    if (e.key === 'Enter') {
      if (commandInput.trim().toUpperCase() === 'IMAGE.EXE' || commandInput.trim().toUpperCase() === 'RUN') {
        handleRun();
      } else if (commandInput.trim().toUpperCase() === 'CLS') {
        setConsoleLogs(['C:\\RETRO> ']);
        setCommandInput('');
      } else {
        setConsoleLogs((prev) => [
          ...prev,
          `C:\\RETRO> ${commandInput}`,
          `Bad command or file name: "${commandInput}"`,
          'C:\\RETRO> ',
        ]);
        setCommandInput('');
      }
    }
  };

  return (
    <div id="dos-terminal" className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            Interactive MS-DOS Virtual Runtime Simulator
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleRun}
              disabled={!result}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-colors ${
                result
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-semibold cursor-pointer'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run IMAGE.EXE</span>
            </button>
          ) : (
            <button
              onClick={handleExitGraphics}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Press Any Key (Exit to DOS)</span>
            </button>
          )}
        </div>
      </div>

      {/* Virtual Monitor Box */}
      <div className="bg-black border-2 border-neutral-800 rounded-lg overflow-hidden shadow-2xl relative min-h-[300px] flex flex-col">
        {!isRunning ? (
          /* DOS Prompt Text Mode (80x25) */
          <div
            className="p-4 font-retro text-amber-400 text-base sm:text-lg flex-1 overflow-y-auto max-h-[360px] leading-snug select-text"
            onClick={() => document.getElementById('dos-input')?.focus()}
          >
            {consoleLogs.map((line, idx) => (
              <div key={idx} className="whitespace-pre-wrap">
                {line}
              </div>
            ))}

            {/* Active Command Line */}
            <div className="flex items-center gap-1 mt-1 text-amber-400">
              <span>C:\RETRO&gt;&nbsp;</span>
              <input
                id="dos-input"
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="bg-transparent text-amber-400 border-none outline-none font-retro text-base sm:text-lg w-full flex-1"
                autoFocus
              />
              <span className="animate-pulse">_</span>
            </div>
            <div ref={termEndRef} />
          </div>
        ) : (
          /* DOS Graphics Mode Running (320x200 CRT Canvas) */
          <div
            onClick={handleExitGraphics}
            className="flex-1 flex flex-col items-center justify-center bg-black cursor-pointer relative p-2"
          >
            <div
              className="relative max-w-full rounded overflow-hidden shadow-2xl border border-neutral-800 crt-scanlines"
              style={{
                aspectRatio: '4 / 3',
                width: '100%',
                maxWidth: '560px',
              }}
            >
              <canvas
                ref={canvasRef}
                className="w-full h-full object-contain [image-rendering:pixelated]"
              />

              {/* In-game text prompt overlay */}
              <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-xs py-1 px-2 rounded border border-neutral-800 flex items-center justify-between text-[11px] font-retro text-amber-300">
                <span>INT 10h Mode {result?.mode === 'vga_mode13h' ? '13h (VGA)' : '0Dh (EGA)'} Active</span>
                <span className="animate-pulse text-amber-400 font-bold">Press any key to exit...</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom DOS Status bar */}
        <div className="bg-neutral-900 border-t border-neutral-800 px-3 py-1 flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Real-Mode 16-bit x86 Execution</span>
          </div>
          <div>Mode: {isRunning ? (result?.mode === 'vga_mode13h' ? '13h (320x200x256)' : '0Dh (320x200 EGA 4-Plane)') : '03h (80x25 Text)'}</div>
        </div>
      </div>
    </div>
  );
};
