'use client';

import { useState } from 'react';
import type { OutputDepth } from '@/lib/types';

const USER_CONTEXT_MAX = 1500;

interface BlurbFormProps {
  onSubmit: (data: {
    listicleUrl: string;
    productUrl: string;
    depth: OutputDepth;
    entryNumber?: number;
    userContext?: string;
    manualListicleEntries?: string;
  }) => void;
  isLoading: boolean;
  showManualFallback: boolean;
}

const inputClass =
  'w-full rounded-[8px] border bg-white text-[#111] placeholder:text-[#b2b2b2] text-sm px-3 py-2.5 shadow-none transition focus:outline-none focus:ring-2 focus:ring-[#042f24] disabled:opacity-50';

const labelClass = 'mb-1.5 block text-sm font-medium text-[#111]';

export default function BlurbForm({ onSubmit, isLoading, showManualFallback }: BlurbFormProps) {
  const [listicleUrl, setListicleUrl] = useState('');
  const [productUrl, setProductUrl] = useState('');
  const [depth, setDepth] = useState<OutputDepth>('medium');
  const [entryNumberStr, setEntryNumberStr] = useState('');
  const [userContext, setUserContext] = useState('');
  const [manualEntries, setManualEntries] = useState('');
  const [showManual, setShowManual] = useState(showManualFallback);
  const [urlError, setUrlError] = useState('');

  function validateInputs(): boolean {
    try {
      new URL(listicleUrl);
      new URL(productUrl);
      setUrlError('');
      return true;
    } catch {
      setUrlError('Please enter valid URLs for both fields.');
      return false;
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateInputs()) return;

    const entryNumber = entryNumberStr ? parseInt(entryNumberStr, 10) : undefined;

    onSubmit({
      listicleUrl: listicleUrl.trim(),
      productUrl: productUrl.trim(),
      depth,
      entryNumber: entryNumber && entryNumber > 0 ? entryNumber : undefined,
      userContext: userContext.trim() || undefined,
      manualListicleEntries: showManual && manualEntries.trim() ? manualEntries.trim() : undefined,
    });
  }

  const depthOptions: { value: OutputDepth; label: string }[] = [
    { value: 'short', label: 'Short' },
    { value: 'medium', label: 'Medium' },
    { value: 'deep', label: 'Deep' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div>
        <label className={labelClass}>
          Listicle URL <span style={{ color: 'var(--ch-orange)' }}>*</span>
        </label>
        <input
          type="url"
          required
          value={listicleUrl}
          onChange={(e) => setListicleUrl(e.target.value)}
          placeholder="https://example.com/top-10-ai-voice-agents"
          disabled={isLoading}
          className={inputClass}
          style={{ borderColor: 'var(--ch-border)' }}
        />
      </div>

      <div>
        <label className={labelClass}>
          Your product URL <span style={{ color: 'var(--ch-orange)' }}>*</span>
        </label>
        <input
          type="url"
          required
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          placeholder="https://yourcompany.com"
          disabled={isLoading}
          className={inputClass}
          style={{ borderColor: 'var(--ch-border)' }}
        />
      </div>

      {urlError && (
        <p className="text-sm" style={{ color: 'var(--ch-orange)' }}>{urlError}</p>
      )}

      {/* Depth + Entry number row */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className={labelClass}>Output depth</label>
          <div
            className="flex overflow-hidden rounded-[8px] border"
            style={{ borderColor: 'var(--ch-border)' }}
          >
            {depthOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDepth(opt.value)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                style={
                  depth === opt.value
                    ? { background: 'var(--ch-green)', color: '#fff' }
                    : { background: '#fff', color: 'var(--ch-text)' }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>
            Entry number{' '}
            <span className="font-normal text-xs" style={{ color: 'var(--ch-text-muted)' }}>
              (optional)
            </span>
          </label>
          <input
            type="number"
            min={1}
            value={entryNumberStr}
            onChange={(e) => setEntryNumberStr(e.target.value)}
            placeholder="auto-detect"
            disabled={isLoading}
            className={inputClass + ' w-32'}
            style={{ borderColor: 'var(--ch-border)' }}
          />
        </div>
      </div>

      {/* Extra context */}
      <div>
        <label className={labelClass}>
          Extra context{' '}
          <span className="font-normal text-xs" style={{ color: 'var(--ch-text-muted)' }}>
            (optional)
          </span>
        </label>
        <textarea
          value={userContext}
          onChange={(e) => setUserContext(e.target.value.slice(0, USER_CONTEXT_MAX))}
          disabled={isLoading}
          placeholder="Anything to emphasize or include (features, ICP, claims to avoid, differentiators, etc.)"
          rows={3}
          className={inputClass}
          style={{ borderColor: 'var(--ch-border)', resize: 'vertical' }}
        />
        <p className="mt-1 text-right text-xs" style={{ color: 'var(--ch-text-muted)' }}>
          {userContext.length} / {USER_CONTEXT_MAX}
        </p>
      </div>

      {/* Manual fallback */}
      <div>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="text-sm font-medium transition-colors hover:underline"
          style={{ color: 'var(--ch-green)' }}
        >
          {showManual ? 'Hide manual entry paste' : "Can't scrape this page? Paste examples manually"}
        </button>

        {showManual && (
          <div className="mt-3">
            <label className={labelClass}>
              Paste 2–3 example entries from the listicle
            </label>
            <textarea
              value={manualEntries}
              onChange={(e) => setManualEntries(e.target.value)}
              disabled={isLoading}
              placeholder="Paste raw markdown or text of 2-3 existing entries from the listicle here..."
              rows={8}
              className={inputClass + ' font-mono'}
              style={{ borderColor: 'var(--ch-border)', resize: 'vertical' }}
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading || !listicleUrl || !productUrl}
        className="w-full rounded-[8px] px-4 py-3 text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
        style={{ background: isLoading ? 'var(--ch-green)' : 'var(--ch-orange)' }}
        onMouseEnter={(e) => {
          if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange-hover)';
        }}
        onMouseLeave={(e) => {
          if (!isLoading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--ch-orange)';
        }}
      >
        {isLoading ? 'Generating…' : 'Generate blurb'}
      </button>
    </form>
  );
}
