export type OutputDepth = 'short' | 'medium' | 'deep';

export interface ListicleEntry {
  number: number;
  name: string;
  rawMarkdown: string; // capped at 1500 chars
}

export interface ScrapeListicleResult {
  entries: ListicleEntry[];         // 2-3 extracted entries for Claude to analyze
  rawFallbackChunk: string;         // first ~2000 chars of article body (best-effort)
  detectedPattern: string;          // e.g. "Core Strengths / Key Differentiators / Best For"
  entryNumberingStyle: string;      // e.g. "### **{n}. Name**"
  bulletStyle: 'asterisk' | 'dash' | 'unknown';
  scrapeMethod: 'heading' | 'bold-text' | 'reader-mode' | 'manual';
}

export interface ScrapeProductResult {
  name: string;
  tagline: string;
  features: string[];
  differentiators: string[];
  useCases: string[];
  pricing: string;
  targetAudience: string;
  rawText: string; // capped at 3000 chars
}

export interface GenerateRequest {
  listicleUrl: string;
  productUrl: string;
  depth: OutputDepth;
  manualListicleEntries?: string; // user-pasted fallback text
  entryNumber?: number;           // optional override; auto-detected as max+1 otherwise
  userContext?: string;           // trusted user-provided emphasis/constraints, max 1500 chars
}

export interface GenerateResponse {
  blurb: string;
  validationWarnings?: string[];
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  failures: string[];
}
