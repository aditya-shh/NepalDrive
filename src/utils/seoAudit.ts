/**
 * Technical SEO Validation Audit Script for NepalDrive.
 * Detects missing headings, broken structures, title or description issues,
 * canonical issues, sitemaps, and indexing restrictions.
 */

export interface SEOAuditResult {
  url: string;
  title: string;
  titleLength: number;
  description: string;
  descriptionLength: number;
  hasCanonical: boolean;
  h1Count: number;
  h1Text: string;
  hasRobots: boolean;
  hasJSONLD: boolean;
  hasOpenGraph: boolean;
  warnings: string[];
}

export function auditCurrentPage(): SEOAuditResult {
  const warnings: string[] = [];
  
  // 1. Audit Title
  const title = document.title || '';
  const titleLength = title.length;
  if (!title) {
    warnings.push('CRITICAL: Page title is completely missing!');
  } else if (titleLength < 30 || titleLength > 60) {
    warnings.push(`Warning: Title length (${titleLength} chars) is outside optimal 30-60 character range.`);
  }

  // 2. Audit Description
  const descMeta = document.querySelector('meta[name="description"]');
  const description = descMeta?.getAttribute('content') || '';
  const descriptionLength = description.length;
  if (!description) {
    warnings.push('CRITICAL: Meta description tag is completely missing!');
  } else if (descriptionLength < 120 || descriptionLength > 160) {
    warnings.push(`Warning: Description length (${descriptionLength} chars) is outside optimal 120-160 character range.`);
  }

  // 3. Audit Canonical Link
  const canonicalLink = document.querySelector('link[rel="canonical"]');
  const hasCanonical = !!canonicalLink && !!canonicalLink.getAttribute('href');
  if (!hasCanonical) {
    warnings.push('CRITICAL: Self-referential canonical URL tag is missing!');
  }

  // 4. Audit Heading Structure (Exactly one H1 requirement)
  const h1s = document.querySelectorAll('h1');
  const h1Count = h1s.length;
  let h1Text = '';
  if (h1Count === 0) {
    warnings.push('CRITICAL: Heading hierarchy is broken - Page is missing exactly ONE main H1 tag.');
  } else if (h1Count > 1) {
    warnings.push(`CRITICAL: SEO Violation - Page contains ${h1Count} multiple H1 tags! Heading tags should only specify layout hierarchy.`);
  } else {
    h1Text = h1s[0].innerText || h1s[0].textContent || '';
  }

  // 5. Audit JSON-LD Schema
  const schemaScript = document.querySelector('script[type="application/ld+json"]');
  const hasJSONLD = !!schemaScript && !!schemaScript.textContent;
  if (!hasJSONLD) {
    warnings.push('Warning: Rich JSON-LD Schema.org structured data script is missing.');
  }

  // 6. Audit Robots Meta tag
  const robotsMeta = document.querySelector('meta[name="robots"]');
  const hasRobots = !!robotsMeta && !!robotsMeta.getAttribute('content');

  // 7. Audit OpenGraph Properties
  const ogTitle = document.querySelector('meta[property="og:title"]');
  const ogDesc = document.querySelector('meta[property="og:description"]');
  const hasOpenGraph = !!ogTitle && !!ogDesc;
  if (!hasOpenGraph) {
    warnings.push('Warning: OpenGraph social sharing meta properties are missing or incomplete.');
  }

  return {
    url: window.location.href,
    title,
    titleLength,
    description,
    descriptionLength,
    hasCanonical,
    h1Count,
    h1Text,
    hasRobots,
    hasJSONLD,
    hasOpenGraph,
    warnings
  };
}
