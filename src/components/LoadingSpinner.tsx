export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-3 py-8" style={{ color: 'var(--ch-text-muted)' }}>
      <div
        className="h-5 w-5 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--ch-border)', borderTopColor: 'var(--ch-orange)' }}
      />
      <span className="text-sm">Scraping pages and generating blurb…</span>
    </div>
  );
}
