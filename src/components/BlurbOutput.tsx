'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
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
          Generated blurb
        </label>
        <div
          className="w-full rounded-[8px] border bg-[#f9f9f8] p-4 text-sm leading-relaxed text-[#111]"
          style={{ borderColor: 'rgba(0,0,0,0.15)' }}
        >
          <ReactMarkdown
            components={{
              h1: ({ children }) => <h1 className="text-base font-bold mb-1 mt-0">{children}</h1>,
              h2: ({ children }) => <h2 className="text-base font-bold mb-1 mt-0">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-bold mb-1 mt-0">{children}</h3>,
              h4: ({ children }) => <h4 className="text-sm font-bold mb-1 mt-0">{children}</h4>,
              p: ({ children }) => <p className="mb-2 mt-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-2 mt-0 pl-4 list-disc">{children}</ul>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--ch-green)' }}>{children}</a>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            }}
          >
            {blurb}
          </ReactMarkdown>
        </div>
        <button
          onClick={handleCopy}
          className="mt-3 rounded-[8px] px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: copied ? 'var(--ch-green)' : 'var(--ch-orange)' }}
          onMouseEnter={(e) => { if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange-hover)'; }}
          onMouseLeave={(e) => { if (!copied) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange)'; }}
        >
          {copied ? 'Copied!' : 'Copy markdown'}
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
