import React from 'react';
import { Terminal, Download, Cpu } from 'lucide-react';

interface HeaderProps {
  onQuickExport: () => void;
  hasImage: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onQuickExport, hasImage }) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-900/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <a href="/" className="text-base font-semibold tracking-tight text-neutral-100 flex items-center gap-2">
              <span>DOS Graphics Studio</span>
              <span className="text-xs font-mono text-amber-400 font-normal px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                MZ & EGA 4-Plane
              </span>
            </a>
          </div>
        </div>

        {/* Zone 2: Navigation / Format links */}
        <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-400 font-medium">
          <a href="#canvas-viewport" className="hover:text-neutral-100 transition-colors">
            320x200 Canvas
          </a>
          <a href="#mz-header-section" className="hover:text-neutral-100 transition-colors">
            MZ Header Inspector
          </a>
          <a href="#qbasic-section" className="hover:text-neutral-100 transition-colors">
            QBasic Binary Code
          </a>
          <a href="#dos-terminal" className="hover:text-neutral-100 transition-colors">
            DOS Terminal Runner
          </a>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onQuickExport}
            disabled={!hasImage}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              hasImage
                ? 'bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-sm shadow-amber-500/20 cursor-pointer'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .EXE & .EGA</span>
          </button>
        </div>
      </div>
    </header>
  );
};
