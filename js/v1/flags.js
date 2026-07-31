/**
 * Shared flag-building logic — used by ANY sport's adapter, not just F1.
 *
 * This file only knows how to turn an ISO 3166-1 alpha-2 country code
 * into a flag image URL (via flagcdn.com — free, no key, no attribution
 * required). It deliberately knows nothing about any specific sport's
 * API format.
 *
 * Each sport's adapter is responsible for translating whatever format
 * its own API uses (demonyms like "British", full names like
 * "Australia", etc.) into an ISO code, then calling flagUrlByIso().
 * See js/v1/adapters/f1.js for an example translation layer.
 */

function flagUrlByIso(isoCode, widthPx) {
  if (!isoCode) return null;
  const size = widthPx || 40;
  return `https://flagcdn.com/w${size}/${isoCode.toLowerCase()}.png`;
}

/**
 * Common full country names -> ISO code. Many sports' APIs (ESPN, etc.)
 * return full names rather than demonyms, so this is here for reuse
 * across sports. Add to this as new sports surface new country names.
 */
const COUNTRY_NAME_TO_ISO = {
  "United States": "us",
  "United Kingdom": "gb",
  "Northern Ireland": "gb",
  "Scotland": "gb",
  "England": "gb",
  "Wales": "gb",
  "Australia": "au",
  "Republic of Ireland": "ie",
  "Ireland": "ie",
  "South Africa": "za",
  "New Zealand": "nz",
  "Spain": "es",
  "Germany": "de",
  "France": "fr",
  "Italy": "it",
  "Japan": "jp",
  "South Korea": "kr",
  "Sweden": "se",
  "Norway": "no",
  "Denmark": "dk",
  "Belgium": "be",
  "Netherlands": "nl",
  "Argentina": "ar",
  "Brazil": "br",
  "Mexico": "mx",
  "Canada": "ca",
  "China": "cn",
  "India": "in",
  "Thailand": "th",
  "Chile": "cl",
  "Colombia": "co",
};

function flagUrlByCountryName(name, widthPx) {
  const iso = COUNTRY_NAME_TO_ISO[name];
  return iso ? flagUrlByIso(iso, widthPx) : null;
}
