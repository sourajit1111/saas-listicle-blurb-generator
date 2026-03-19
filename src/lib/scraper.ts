import * as dns from 'dns';
import * as net from 'net';
import { load, type CheerioAPI } from 'cheerio';
import type { ScrapeListicleResult, ScrapeProductResult, ListicleEntry, ScreenshotType } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const ENTRY_CAP = 1500;
const FALLBACK_CAP = 2000;
const PRODUCT_TEXT_CAP = 3000;
const FETCH_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// SSRF URL guard
// ---------------------------------------------------------------------------

function isPrivateIp(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1') return true;

  // IPv6 loopback / link-local
  if (ip.startsWith('fe80:') || ip.startsWith('FE80:')) return true;

  // Parse IPv4
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
}

export async function validateUrl(
  rawUrl: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { ok: false, reason: 'Only http/https URLs are allowed' };
  }

  const hostname = parsed.hostname;

  if (hostname.endsWith('.local')) {
    return { ok: false, reason: 'Private hostnames (.local) are not allowed' };
  }

  // Resolve hostname and check for private IPs
  try {
    const result = await dns.promises.lookup(hostname, { all: true });
    for (const addr of result) {
      if (isPrivateIp(addr.address)) {
        return { ok: false, reason: `URL resolves to a private/internal IP address (${addr.address})` };
      }
    }
  } catch {
    return { ok: false, reason: `Could not resolve hostname: ${hostname}` };
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------------------
// HTML → lightweight markdown conversion
// ---------------------------------------------------------------------------

function htmlToMarkdown($: CheerioAPI, el: ReturnType<CheerioAPI>): string {
  let text = '';

  el.contents().each((_, node) => {
    if (node.type === 'text') {
      text += (node as { data: string }).data;
      return;
    }
    if (node.type !== 'tag') return;

    const tag = node.name.toLowerCase();
    const child = $(node);

    if (tag === 'br') {
      text += '\n';
    } else if (tag === 'strong' || tag === 'b') {
      text += `**${htmlToMarkdown($, child).trim()}**`;
    } else if (tag === 'em' || tag === 'i') {
      text += `_${htmlToMarkdown($, child).trim()}_`;
    } else if (tag === 'a') {
      const href = child.attr('href') || '';
      const linkText = htmlToMarkdown($, child).trim();
      text += href ? `[${linkText}](${href})` : linkText;
    } else if (tag === 'li') {
      text += `* ${htmlToMarkdown($, child).trim()}\n`;
    } else if (tag === 'ul' || tag === 'ol') {
      text += '\n' + htmlToMarkdown($, child) + '\n';
    } else if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
      const inner = htmlToMarkdown($, child).trim();
      if (inner) text += inner + '\n\n';
    } else {
      text += htmlToMarkdown($, child);
    }
  });

  return text;
}

// ---------------------------------------------------------------------------
// Listicle scraping
// ---------------------------------------------------------------------------

const NUMBERED_HEADING_RE = /^\*{0,2}(\d+)\.?\s+(.+)/;

function extractEntriesFromHeadings($: CheerioAPI): ListicleEntry[] {
  const entries: ListicleEntry[] = [];
  const headings = $('h2, h3, h4').filter((_, el) => {
    return NUMBERED_HEADING_RE.test($(el).text().trim());
  });

  if (headings.length === 0) return [];

  const headingTag = $(headings[0]).prop('tagName')!.toLowerCase();

  headings.slice(0, 3).each((_, headingEl) => {
    const headingText = $(headingEl).text().trim();
    const match = headingText.match(NUMBERED_HEADING_RE);
    if (!match) return;

    const number = parseInt(match[1], 10);
    const name = match[2].replace(/\*+/g, '').trim();

    // Collect markdown for this heading + all following siblings until next same-level heading
    let markdown = htmlToMarkdown($, $(headingEl)).trim() + '\n\n';
    let sibling = $(headingEl).next();
    while (sibling.length) {
      const sibTag = sibling.prop('tagName')?.toLowerCase();
      if (sibTag === headingTag) break;
      markdown += htmlToMarkdown($, sibling).trim() + '\n\n';
      sibling = sibling.next();
    }

    entries.push({
      number,
      name,
      rawMarkdown: markdown.trim().slice(0, ENTRY_CAP),
    });
  });

  return entries;
}

function extractEntriesFromBoldText($: CheerioAPI): ListicleEntry[] {
  const entries: ListicleEntry[] = [];

  $('p strong, p b, strong, b').filter((_, el) => {
    return NUMBERED_HEADING_RE.test($(el).text().trim());
  }).slice(0, 3).each((_, el) => {
    const text = $(el).text().trim();
    const match = text.match(NUMBERED_HEADING_RE);
    if (!match) return;

    const number = parseInt(match[1], 10);
    const name = match[2].replace(/\*+/g, '').trim();

    // Collect the parent paragraph + following siblings
    const parent = $(el).closest('p');
    let markdown = `**${text}**\n\n`;
    let sibling = parent.next();
    let collected = 0;
    while (sibling.length && collected < 5) {
      const sibTag = sibling.prop('tagName')?.toLowerCase();
      if (sibTag && ['h2', 'h3', 'h4'].includes(sibTag)) break;
      if (sibTag === 'p' && NUMBERED_HEADING_RE.test(sibling.find('strong, b').first().text().trim())) break;
      markdown += htmlToMarkdown($, sibling).trim() + '\n\n';
      sibling = sibling.next();
      collected++;
    }

    entries.push({
      number,
      name,
      rawMarkdown: markdown.trim().slice(0, ENTRY_CAP),
    });
  });

  return entries;
}

function detectBulletStyle($: CheerioAPI): 'asterisk' | 'dash' | 'unknown' {
  const bodyText = $('body').text();
  const asterisks = (bodyText.match(/^\s*\*/gm) || []).length;
  const dashes = (bodyText.match(/^\s*-\s/gm) || []).length;
  if (asterisks > dashes) return 'asterisk';
  if (dashes > asterisks) return 'dash';
  return 'unknown';
}

function detectPattern(entries: ListicleEntry[]): string {
  if (entries.length === 0) return '';
  const combined = entries.map(e => e.rawMarkdown).join(' ');
  const labels: string[] = [];
  for (const label of ['Core Strengths', 'Key Differentiators', 'Best For', 'Pricing', 'Pros', 'Cons', 'Overview', 'Features', 'Use Cases']) {
    if (combined.includes(label)) labels.push(label);
  }
  return labels.join(' / ');
}

function detectScreenshotType($: CheerioAPI): ScreenshotType {
  // Look for images inside numbered entry sections
  const imgCount = $('img').length;
  if (imgCount === 0) return 'none';

  let websiteHints = 0;
  let productHints = 0;

  $('img').each((_, el) => {
    const src = ($(el).attr('src') || '').toLowerCase();
    const alt = ($(el).attr('alt') || '').toLowerCase();
    const cls = ($(el).attr('class') || '').toLowerCase();

    // Website screenshot clues
    if (src.includes('screenshot') || alt.includes('screenshot') || alt.includes('homepage') || alt.includes('website')) {
      websiteHints++;
    }
    // Product/dashboard clues
    if (alt.includes('dashboard') || alt.includes('interface') || alt.includes('app') || alt.includes('product') || cls.includes('product')) {
      productHints++;
    }
    // Wide images near entry headings likely to be screenshots
    const width = parseInt($(el).attr('width') || '0', 10);
    if (width > 600) websiteHints++;
  });

  // Check surrounding text for clues
  const bodyText = $('body').text().toLowerCase();
  if (bodyText.includes('screenshot') || bodyText.includes('homepage') || bodyText.includes('website screenshot')) {
    websiteHints += 2;
  }
  if (bodyText.includes('product screenshot') || bodyText.includes('dashboard') || bodyText.includes('interface screenshot')) {
    productHints += 2;
  }

  if (productHints > websiteHints) return 'product';
  if (imgCount > 0) return 'website'; // default to website if images exist
  return 'none';
}

function detectNumberingStyle(entries: ListicleEntry[]): string {
  if (entries.length === 0) return '';
  const first = entries[0].rawMarkdown.split('\n')[0];
  // Detect heading level
  const hashes = first.match(/^(#{1,4})\s/);
  const level = hashes ? hashes[1] : '';
  const hasBold = first.includes('**');
  if (level && hasBold) return `${level} **{n}. Name**`;
  if (level) return `${level} {n}. Name`;
  return '{n}. Name';
}

export async function scrapeListicle(url: string): Promise<ScrapeListicleResult> {
  const html = await fetchHtml(url);
  const $ = load(html);

  // Remove noise
  $('nav, footer, aside, script, style, noscript, header').remove();

  // Strategy 1: heading heuristic
  let entries = extractEntriesFromHeadings($);
  let scrapeMethod: ScrapeListicleResult['scrapeMethod'] = 'heading';

  // Strategy 2: bold text fallback
  if (entries.length === 0) {
    entries = extractEntriesFromBoldText($);
    scrapeMethod = 'bold-text';
  }

  // Strategy 3: reader-mode — just extract body text
  if (entries.length === 0) {
    scrapeMethod = 'reader-mode';
  }

  const bodyText = ($('article').length ? $('article') : $('main').length ? $('main') : $('body'))
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, FALLBACK_CAP);

  const bulletStyle = detectBulletStyle($);
  const detectedPattern = detectPattern(entries);
  const entryNumberingStyle = detectNumberingStyle(entries);
  const screenshotType = detectScreenshotType($);

  return {
    entries,
    rawFallbackChunk: bodyText,
    detectedPattern,
    entryNumberingStyle,
    bulletStyle,
    scrapeMethod,
    screenshotType,
  };
}

// ---------------------------------------------------------------------------
// Product scraping
// ---------------------------------------------------------------------------

export async function scrapeProduct(url: string): Promise<ScrapeProductResult> {
  const html = await fetchHtml(url);
  const $ = load(html);

  $('nav, footer, script, style, noscript, header').remove();

  const name = $('title').first().text().split(/[-|–]/)[0].trim() || '';
  const tagline = $('h1').first().text().trim() || '';

  const features: string[] = [];
  $('h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length < 80 && features.length < 10) {
      features.push(text);
    }
  });

  const differentiators: string[] = [];
  $('li').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 10 && text.length < 200 && differentiators.length < 10) {
      differentiators.push(text);
    }
  });

  const useCases: string[] = [];
  $('*').filter((_, el) => {
    const text = $(el).text().toLowerCase();
    return text.includes('use case') || text.includes('industries') || text.includes('for teams');
  }).slice(0, 3).each((_, el) => {
    const text = $(el).text().trim();
    if (text && useCases.length < 3) useCases.push(text.slice(0, 150));
  });

  const rawText = $('body')
    .text()
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, PRODUCT_TEXT_CAP);

  // Try to get OG image — SaaS products often use a product/dashboard screenshot
  const ogImage = $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    undefined;

  return {
    name,
    tagline,
    features: features.slice(0, 10),
    differentiators: differentiators.slice(0, 10),
    useCases,
    pricing: '',
    targetAudience: '',
    rawText,
    ogImage,
  };
}

// ---------------------------------------------------------------------------
// Screenshot URL helpers
// ---------------------------------------------------------------------------

/**
 * Returns a URL for a website homepage screenshot (1st fold, 1280px wide).
 * Uses thum.io — free, no API key required.
 */
export function getWebsiteScreenshotUrl(productUrl: string): string {
  return `https://image.thum.io/get/width/1280/crop/800/noanimate/${productUrl}`;
}

/**
 * Returns the best available product screenshot URL.
 * Prefers OG image (often a product/dashboard screenshot for SaaS).
 * Falls back to website screenshot via thum.io.
 */
export function getProductScreenshotUrl(productUrl: string, ogImage?: string): string {
  if (ogImage && ogImage.startsWith('http')) return ogImage;
  // Fall back to website screenshot
  return getWebsiteScreenshotUrl(productUrl);
}
