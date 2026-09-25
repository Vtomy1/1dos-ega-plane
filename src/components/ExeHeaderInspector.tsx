import React, { useState } from 'react';
import { DosExeHeader } from '../types/dos';
import { Binary, FileCode, Cpu, Download, Check, Copy } from 'lucide-react';

interface ExeHeaderInspectorProps {
  header: DosExeHeader | null;
  exeBuffer: Uint8Array | null;
  comBuffer: Uint8Array | null;
  asmSource: string;
  onDownloadExe: () => void;
  onDownloadCom: () => void;
}

export const ExeHeaderInspector: React.FC<ExeHeaderInspectorProps> = ({
  header,
  exeBuffer,
  comBuffer,
  asmSource,
  onDownloadExe,
  onDownloadCom,
}) => {
  const [activeTab, setActiveTab] = useState<'fields' | 'hexdump' | 'disasm'>('fields');
  const [copiedAsm, setCopiedAsm] = useState(false);

  const handleCopyAsm = () => {
    navigator.clipboard.writeText(asmSource);
    setCopiedAsm(true);
    setTimeout(() => setCopiedAsm(false), 2000);
  };

  if (!header || !exeBuffer) {
    return (
      <div id="mz-header-section" className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 text-center text-neutral-400 text-xs">
        Generate or load an image to inspect the authentic MS-DOS MZ .EXE header.
      </div>
    );
  }

  // Header field definitions for the table
  const headerFields = [
    {
      offset: '0x00',
      name: 'e_magic',
      type: 'WORD',
      valueHex: `0x${header.signature.toString(16).toUpperCase()}`,
      valueDec: header.signature,
      meaning: '"MZ" (Mark Zbikowski signature 0x5A4D)',
      status: 'Valid MS-DOS Signature',
    },
    {
      offset: '0x02',
      name: 'e_cblp',
      type: 'WORD',
      valueHex: `0x${header.lastPageBytes.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.lastPageBytes,
      meaning: 'Bytes on last 512-byte page of file',
      status: `${header.lastPageBytes} bytes`,
    },
    {
      offset: '0x04',
      name: 'e_cp',
      type: 'WORD',
      valueHex: `0x${header.pagesInFile.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.pagesInFile,
      meaning: 'Total 512-byte pages in executable',
      status: `${header.pagesInFile} pages (~${Math.round((header.pagesInFile * 512) / 1024)} KB)`,
    },
    {
      offset: '0x06',
      name: 'e_crlc',
      type: 'WORD',
      valueHex: `0x${header.relocationsCount.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.relocationsCount,
      meaning: 'Relocation entries count',
      status: `${header.relocationsCount} relocations`,
    },
    {
      offset: '0x08',
      name: 'e_cparhdr',
      type: 'WORD',
      valueHex: `0x${header.headerParagraphs.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.headerParagraphs,
      meaning: 'Header size in 16-byte paragraphs',
      status: `${header.headerParagraphs} paragraphs (64 bytes)`,
    },
    {
      offset: '0x0A',
      name: 'e_minalloc',
      type: 'WORD',
      valueHex: `0x${header.minExtraParagraphs.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.minExtraParagraphs,
      meaning: 'Minimum extra paragraphs needed by program',
      status: '32 paragraphs (512 bytes)',
    },
    {
      offset: '0x0C',
      name: 'e_maxalloc',
      type: 'WORD',
      valueHex: `0x${header.maxExtraParagraphs.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.maxExtraParagraphs,
      meaning: 'Maximum extra paragraphs (0xFFFF = All available memory)',
      status: 'All conventional RAM',
    },
    {
      offset: '0x0E',
      name: 'e_ss',
      type: 'WORD',
      valueHex: `0x${header.initialSS.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.initialSS,
      meaning: 'Initial relative SS register value',
      status: 'Base stack segment',
    },
    {
      offset: '0x10',
      name: 'e_sp',
      type: 'WORD',
      valueHex: `0x${header.initialSP.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.initialSP,
      meaning: 'Initial SP stack pointer register',
      status: '0x0800 (2 KB stack)',
    },
    {
      offset: '0x12',
      name: 'e_csum',
      type: 'WORD',
      valueHex: `0x${header.checksum.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.checksum,
      meaning: 'Checksum (unused in DOS)',
      status: '0x0000',
    },
    {
      offset: '0x14',
      name: 'e_ip',
      type: 'WORD',
      valueHex: `0x${header.initialIP.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.initialIP,
      meaning: 'Initial IP instruction pointer (Entry Point)',
      status: 'CS:0000h (Start of machine code)',
    },
    {
      offset: '0x16',
      name: 'e_cs',
      type: 'WORD',
      valueHex: `0x${header.initialCS.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.initialCS,
      meaning: 'Initial relative CS code segment',
      status: '0x0000',
    },
    {
      offset: '0x18',
      name: 'e_lfarlc',
      type: 'WORD',
      valueHex: `0x${header.relocTableOffset.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.relocTableOffset,
      meaning: 'File offset to relocation table',
      status: 'Offset 0x0040 (64 bytes)',
    },
    {
      offset: '0x1A',
      name: 'e_ovno',
      type: 'WORD',
      valueHex: `0x${header.overlayNumber.toString(16).toUpperCase().padStart(4, '0')}`,
      valueDec: header.overlayNumber,
      meaning: 'Overlay number (0 = Main executable)',
      status: 'Main program',
    },
  ];

  // Render first 128 bytes in hex format
  const renderHexDump = () => {
    const lines = [];
    const maxBytes = Math.min(128, exeBuffer.length);
    for (let offset = 0; offset < maxBytes; offset += 16) {
      const hexVals = [];
      const asciiVals = [];
      for (let i = 0; i < 16; i++) {
        if (offset + i < maxBytes) {
          const b = exeBuffer[offset + i];
          hexVals.push(b.toString(16).padStart(2, '0').toUpperCase());
          asciiVals.push(b >= 32 && b <= 126 ? String.fromCharCode(b) : '.');
        } else {
          hexVals.push('  ');
          asciiVals.push(' ');
        }
      }
      lines.push(
        <div key={offset} className="flex font-mono text-[11px] leading-5 hover:bg-neutral-800/40 px-1 rounded">
          <span className="text-amber-500 w-16 select-none">{offset.toString(16).padStart(4, '0').toUpperCase()}:</span>
          <span className="text-neutral-200 flex-1 space-x-1.5">
            {hexVals.map((h, idx) => (
              <span
                key={idx}
                className={
                  offset + idx < 64
                    ? 'text-amber-300 font-semibold' // MZ Header
                    : 'text-neutral-400' // Code payload
                }
              >
                {h}
              </span>
            ))}
          </span>
          <span className="text-neutral-500 select-none pl-3 border-l border-neutral-800">
            {asciiVals.join('')}
          </span>
        </div>
      );
    }
    return lines;
  };

  return (
    <div id="mz-header-section" className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 space-y-4">
      {/* Header and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Binary className="w-4 h-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-neutral-200">
            MS-DOS MZ .EXE Header & Disassembly
          </h2>
          <span className="text-xs text-neutral-500">·</span>
          <span className="text-xs font-mono text-neutral-400">
            FileSize: {exeBuffer.length.toLocaleString()} bytes
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded p-0.5 text-xs">
            <button
              onClick={() => setActiveTab('fields')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'fields' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Header Fields
            </button>
            <button
              onClick={() => setActiveTab('hexdump')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'hexdump' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Hex Dump
            </button>
            <button
              onClick={() => setActiveTab('disasm')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'disasm' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              x86 Assembly
            </button>
          </div>

          <button
            onClick={onDownloadExe}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-medium transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>.EXE ({Math.round(exeBuffer.length / 1024)} KB)</span>
          </button>

          {comBuffer && (
            <button
              onClick={onDownloadCom}
              className="flex items-center gap-1.5 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded text-xs font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>.COM</span>
            </button>
          )}
        </div>
      </div>

      {/* Content depending on active tab */}
      {activeTab === 'fields' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 font-mono text-[11px]">
                <th className="py-1.5 px-2">Offset</th>
                <th className="py-1.5 px-2">Field</th>
                <th className="py-1.5 px-2">Hex</th>
                <th className="py-1.5 px-2">Dec</th>
                <th className="py-1.5 px-2">Technical Description</th>
                <th className="py-1.5 px-2">Decoded Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60 font-mono text-[11px]">
              {headerFields.map((f, i) => (
                <tr key={i} className="hover:bg-neutral-800/30">
                  <td className="py-1 px-2 text-amber-500">{f.offset}</td>
                  <td className="py-1 px-2 text-neutral-200 font-semibold">{f.name}</td>
                  <td className="py-1 px-2 text-amber-300 font-bold">{f.valueHex}</td>
                  <td className="py-1 px-2 text-neutral-400 tabular-nums">{f.valueDec}</td>
                  <td className="py-1 px-2 text-neutral-300 font-sans">{f.meaning}</td>
                  <td className="py-1 px-2 text-emerald-400 font-sans">{f.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'hexdump' && (
        <div className="space-y-2">
          <div className="flex items-center gap-4 text-[11px] text-neutral-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-amber-400 inline-block"></span>
              MZ Header (64 bytes)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-neutral-400 inline-block"></span>
              Real-Mode x86 Machine Code & Video Buffer Payload
            </span>
          </div>
          <div className="bg-neutral-950 p-3 rounded border border-neutral-800/80 overflow-x-auto">
            {renderHexDump()}
          </div>
        </div>
      )}

      {activeTab === 'disasm' && (
        <div className="relative">
          <button
            onClick={handleCopyAsm}
            className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-800/80 hover:bg-neutral-700 text-neutral-200 text-xs border border-neutral-700 transition-colors z-10"
          >
            {copiedAsm ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedAsm ? 'Copied ASM' : 'Copy Source'}</span>
          </button>
          <pre className="bg-neutral-950 p-4 rounded border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto max-h-[360px] leading-relaxed">
            {asmSource}
          </pre>
        </div>
      )}
    </div>
  );
};
