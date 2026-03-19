'use client';

import { useState } from 'react';
import type { ScreenshotType } from '@/lib/types';

interface BlurbOutputProps {
  blurb: string;
  validationWarnings?: string[];
  screenshotUrl?: string;
  screenshotType?: ScreenshotType;
}

export default function BlurbOutput({ blurb, validationWarnings, screenshotUrl, screenshotType }: BlurbOutputProps) {
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(blurb);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyUrl() {
    if (!screenshotUrl) return;
    await navigator.clipboard.writeText(screenshotUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  return (
    <div className="space-y-5">
      {validationWarnings && validationWarnings.length > 0 && (
        <div
          className="rounded-[8px] border px-4 py-3 text-sm"
          style={{ background: '#f0fde8', borderColor: '#b8ff90', color: '#042f24' }}
        >
          <p className="font-medium">Auto-corrections applied:</p>
          <ul className="mt-1 list-disc pl-4">
            {validationWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Blurb */}
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
          onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange-hover)'; }}
          onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange)'; }}
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
      </div>

      {/* Screenshot */}
      {screenshotUrl && screenshotType && screenshotType !== 'none' && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <label className="text-sm font-medium text-[#111]">Screenshot</label>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: 'var(--ch-neon)', color: 'var(--ch-green)' }}
            >
              {screenshotType === 'product' ? 'Product' : 'Website'}
            </span>
          </div>

          {/* Preview */}
          <div
            className="overflow-hidden rounded-[8px] border"
            style={{ borderColor: 'rgba(0,0,0,0.15)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotUrl}
              alt="Product screenshot"
              className="w-full object-cover"
              style={{ maxHeight: '300px', objectPosition: 'top' }}
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={screenshotUrl}
              className="flex-1 rounded-[8px] border bg-[#f9f9f8] px-3 py-2 text-xs text-[#111] focus:outline-none"
              style={{ borderColor: 'rgba(0,0,0,0.15)' }}
            />
            <button
              onClick={handleCopyUrl}
              className="shrink-0 rounded-[8px] px-3 py-2 text-xs font-semibold text-white transition-all active:scale-[0.97]"
              style={{ background: copiedUrl ? 'var(--ch-green)' : 'var(--ch-orange)' }}
              onMouseEnter={(e) => { if (!copiedUrl) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange-hover)'; }}
              onMouseLeave={(e) => { if (!copiedUrl) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange)'; }}
            >
              {copiedUrl ? 'Copied!' : 'Copy URL'}
            </button>
            <a
              href={screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-[8px] border px-3 py-2 text-xs font-semibold transition-colors hover:bg-[#f2f2f2]"
              style={{ borderColor: 'rgba(0,0,0,0.15)', color: 'var(--ch-text)' }}
            >
              Open
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
