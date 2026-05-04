/**
 * Build a thum.io screenshot URL for any public website.
 * Free, no key required. https://www.thum.io
 *
 * @example
 *   screenshotUrl("https://www.hn-driver.com", 800)
 *   → "https://image.thum.io/get/width/800/crop/500/https://www.hn-driver.com"
 */
export function screenshotUrl(url: string, width = 800, cropHeight = 500): string {
  if (!url) return "";
  const clean = url.trim();
  return `https://image.thum.io/get/width/${width}/crop/${cropHeight}/noanimate/${clean}`;
}
