'use client';

import { useState } from 'react';
import BlurbForm from '@/components/BlurbForm';
import BlurbOutput from '@/components/BlurbOutput';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { OutputDepth, ScreenshotType } from '@/lib/types';

interface GenerateResult {
  blurb: string;
  validationWarnings?: string[];
  screenshotUrl?: string;
  screenshotType?: ScreenshotType;
}

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showManualFallback, setShowManualFallback] = useState(false);

  async function handleGenerate(data: {
    listicleUrl: string;
    productUrl: string;
    depth: OutputDepth;
    entryNumber?: number;
    userContext?: string;
    manualListicleEntries?: string;
    includeScreenshot?: boolean;
  }) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setShowManualFallback(false);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Something went wrong.');
        if (json.needsManualFallback) {
          setShowManualFallback(true);
        }
        return;
      }

      setResult({
        blurb: json.blurb,
        validationWarnings: json.validationWarnings,
        screenshotUrl: json.screenshotUrl,
        screenshotType: json.screenshotType,
      });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-14" style={{ background: 'var(--ch-bg-secondary)' }}>
      <a
        href="https://www.youtube.com/watch?v=Hx_02aGQm38&list=RDHx_02aGQm38&start_radio=1"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 right-4 text-2xl leading-none transition-transform hover:scale-110 active:scale-95"
        title="Cheers 🍺"
      >
        🍺
      </a>
      <div className="mx-auto max-w-2xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background: 'var(--ch-neon)',
              color: 'var(--ch-green)',
            }}
          >
            Listicle Blurb Generator
          </div>
          <h1
            className="text-4xl font-semibold tracking-tight"
            style={{ color: 'var(--ch-text)' }}
          >
            Get featured in any listicle
          </h1>
          <p className="mt-3 text-base" style={{ color: 'var(--ch-text-muted)' }}>
            Paste a listicle URL and your product URL — get a perfectly-formatted entry
            that matches the article&apos;s exact style.
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-[8px] border p-6 shadow-sm"
          style={{ background: 'var(--ch-bg)', borderColor: 'var(--ch-border)' }}
        >
          <BlurbForm
            onSubmit={handleGenerate}
            isLoading={isLoading}
            showManualFallback={showManualFallback}
          />
        </div>

        {isLoading && (
          <div className="mt-6">
            <LoadingSpinner />
          </div>
        )}

        {error && !isLoading && (
          <div
            className="mt-6 rounded-[8px] border px-4 py-3 text-sm"
            style={{
              background: '#fff5f2',
              borderColor: '#f75301',
              color: '#c44200',
            }}
          >
            {error}
          </div>
        )}

        {result && !isLoading && (
          <div
            className="mt-6 rounded-[8px] border p-6 shadow-sm"
            style={{ background: 'var(--ch-bg)', borderColor: 'var(--ch-border)' }}
          >
            <BlurbOutput
              blurb={result.blurb}
              validationWarnings={result.validationWarnings}
              screenshotUrl={result.screenshotUrl}
              screenshotType={result.screenshotType}
            />
          </div>
        )}
      </div>
    </main>
  );
}
