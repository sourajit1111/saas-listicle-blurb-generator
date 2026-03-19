import { NextResponse } from 'next/server';
import { validateUrl, scrapeListicle, scrapeProduct } from '@/lib/scraper';
import { generateBlurb } from '@/lib/claude';
import { validateBlurb, extractMustIncludeItems } from '@/lib/validator';
import type { GenerateRequest, ScrapeListicleResult } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY is not set on the server. Please add it in Vercel → Settings → Environment Variables.' },
      { status: 500 }
    );
  }

  let body: GenerateRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    listicleUrl,
    productUrl,
    depth = 'medium',
    manualListicleEntries,
    entryNumber: requestedEntryNumber,
    userContext: rawUserContext,
  } = body;

  // Validate required fields
  if (!listicleUrl || !productUrl) {
    return NextResponse.json({ error: 'Both listicleUrl and productUrl are required' }, { status: 400 });
  }

  // Validate depth
  if (!['short', 'medium', 'deep'].includes(depth)) {
    return NextResponse.json({ error: 'depth must be short, medium, or deep' }, { status: 400 });
  }

  // Sanitize userContext
  const userContext = (rawUserContext ?? '').trim().slice(0, 1500);

  // SSRF check for both URLs (skip for manual mode where listicle URL might still be validated)
  const listicleValidation = await validateUrl(listicleUrl);
  if (!listicleValidation.ok) {
    return NextResponse.json(
      { error: `Listicle URL is not allowed: ${listicleValidation.reason}` },
      { status: 400 }
    );
  }

  const productValidation = await validateUrl(productUrl);
  if (!productValidation.ok) {
    return NextResponse.json(
      { error: `Product URL is not allowed: ${productValidation.reason}` },
      { status: 400 }
    );
  }

  // Build listicle data
  let listicleData: ScrapeListicleResult;

  if (manualListicleEntries && manualListicleEntries.trim().length > 0) {
    // Use manually pasted entries
    listicleData = {
      entries: [],
      rawFallbackChunk: manualListicleEntries.trim().slice(0, 2000),
      detectedPattern: '',
      entryNumberingStyle: '',
      bulletStyle: 'unknown',
      scrapeMethod: 'manual',
    };
  } else {
    // Scrape listicle
    try {
      listicleData = await scrapeListicle(listicleUrl);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json(
        {
          error: `Could not fetch the listicle page: ${msg}. Try pasting example entries manually.`,
          needsManualFallback: true,
        },
        { status: 422 }
      );
    }

    if (listicleData.entries.length === 0 && listicleData.rawFallbackChunk.length < 100) {
      return NextResponse.json(
        {
          error:
            'Could not extract content from the listicle. The page may be JavaScript-rendered or paywalled. Try pasting example entries manually.',
          needsManualFallback: true,
          scrapeMethod: listicleData.scrapeMethod,
        },
        { status: 422 }
      );
    }
  }

  // Scrape product page
  let productData;
  try {
    productData = await scrapeProduct(productUrl);
  } catch {
    // Non-fatal: use empty product data
    productData = {
      name: '',
      tagline: '',
      features: [],
      differentiators: [],
      useCases: [],
      pricing: '',
      targetAudience: '',
      rawText: '',
    };
  }

  // Determine entry number
  let entryNumber: number | string = 'N';
  if (requestedEntryNumber && requestedEntryNumber > 0) {
    entryNumber = requestedEntryNumber;
  } else if (listicleData.entries.length > 0) {
    const nums = listicleData.entries.map((e) => e.number).filter((n) => n > 0);
    if (nums.length > 0) {
      entryNumber = Math.max(...nums) + 1;
    }
  }

  // Generate blurb
  let blurb: string;
  try {
    blurb = await generateBlurb(listicleData, productData, depth, userContext, entryNumber);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate blurb: ${msg}. Check your ANTHROPIC_API_KEY.` },
      { status: 500 }
    );
  }

  // Validate + repair
  const validationResult = validateBlurb(blurb, listicleData, userContext);
  const allWarnings: string[] = [];

  if (!validationResult.valid) {
    // One repair attempt
    try {
      const repairedBlurb = await generateBlurb(
        listicleData,
        productData,
        depth,
        userContext,
        entryNumber,
        validationResult.failures
      );
      blurb = repairedBlurb;
      allWarnings.push(...validationResult.failures.map((f) => `Auto-corrected: ${f}`));
    } catch {
      // If repair fails, return original blurb with warnings
      allWarnings.push(...validationResult.failures.map((f) => `Could not auto-correct: ${f}`));
    }
  }

  // Soft check: must-include items from userContext
  const mustItems = extractMustIncludeItems(userContext);
  for (const item of mustItems) {
    if (!blurb.toLowerCase().includes(item.toLowerCase())) {
      allWarnings.push(`Must-include item "${item}" not found in output`);
    }
  }

  return NextResponse.json({
    blurb,
    validationWarnings: allWarnings.length > 0 ? allWarnings : undefined,
  });
}
