'use client';

import { useState } from 'react';

interface BlurbOutputProps {
  blurb: string;
  validationWarnings?: string[];
}

export default function BlurbOutput({ blurb, validationWarnings }: BlurbOutputProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(blurb);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {validationWarnings && validationWarnings.length > 0 && (
        <div
          className="rounded-[8px] border px-4 py-3 text-sm"
          style={{
            background: '#f0fde8',
            borderColor: '#b8ff90',
            color: '#042f24',
          }}
        >
          <p className="font-medium">Auto-corrections applied:</p>
          <ul className="mt-1 list-disc pl-4">
            {validationWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#111]">
          Generated blurb — raw markdown
        </label>
        <textarea
          readOnly
          value={blurb}
          rows={Math.max(10, blurb.split('\n').length + 2)}
          className="w-full rounded-[8px] border bg-[#f9f9f8] p-3 font-mono text-sm leading-relaxed text-[#111] focus:outline-none"
          style={{ borderColor: 'rgba(0,0,0,0.15)', resize: 'none' }}
        />
        <button
          onClick={handleCopy}
          className="mt-3 rounded-[8px] px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: copied ? 'var(--ch-green)' : 'var(--ch-orange)' }}
          onMouseEnter={(e) => {
            if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange-hover)';
          }}
          onMouseLeave={(e) => {
            if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange)';
          }}
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
      </div>
    </div>
  );
}
