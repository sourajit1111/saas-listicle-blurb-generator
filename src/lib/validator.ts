import type { ScrapeListicleResult, ValidationResult } from './types';

/**
 * Validate that the generated blurb matches the detected listicle structure.
 * Only applies checks when we have enough signal (heading/bold-text strategies).
 */
export function validateBlurb(
  blurb: string,
  listicle: ScrapeListicleResult,
  userContext: string
): ValidationResult {
  const failures: string[] = [];

  const canCheck =
    listicle.scrapeMethod === 'heading' || listicle.scrapeMethod === 'bold-text';

  if (canCheck) {
    // 1. Bullet character check
    if (listicle.bulletStyle === 'asterisk' && /^-\s/m.test(blurb) && !/^\* /m.test(blurb)) {
      failures.push('bullet character should be * (asterisk), not - (dash)');
    }
    if (listicle.bulletStyle === 'dash' && /^\* /m.test(blurb) && !/^-\s/m.test(blurb)) {
      failures.push('bullet character should be - (dash), not * (asterisk)');
    }

    // 2. Required section checks (when pattern was detected)
    const pattern = listicle.detectedPattern;
    if (pattern.includes('Core Strengths') && !blurb.includes('Core Strengths')) {
      failures.push('missing "Core Strengths" section');
    }
    if (pattern.includes('Key Differentiators') && !blurb.includes('Key Differentiators')) {
      failures.push('missing "Key Differentiators" section');
    }
    if (pattern.includes('Best For') && !blurb.includes('Best For')) {
      failures.push('missing "Best For" section');
    }
  }

  // 3. User context "must include" soft check (always applies)
  const mustIncludeItems = extractMustIncludeItems(userContext);
  for (const item of mustIncludeItems) {
    if (!blurb.toLowerCase().includes(item.toLowerCase())) {
      failures.push(`must-include item "${item}" not found in output`);
    }
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}

/**
 * Extract "must include: X" or "must mention: X" items from user context.
 */
export function extractMustIncludeItems(userContext: string): string[] {
  const items: string[] = [];
  const re = /must\s+(?:include|mention)[:\s]+([^\n,;.]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(userContext)) !== null) {
    const item = match[1].trim();
    if (item) items.push(item);
  }
  return items;
}
