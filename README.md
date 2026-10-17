# Lighthouse Bulk Audit: Core Web Vitals, SEO & Accessibility Scores

[![Run on Apify](https://img.shields.io/badge/Run%20on-Apify-1f6feb?logo=apify)](https://apify.com/manageable_gully/lighthouse-bulk-audit) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Run it in the cloud with no setup:** [Lighthouse Bulk Audit: Core Web Vitals & SEO Scores on the Apify Store](https://apify.com/manageable_gully/lighthouse-bulk-audit).  
> Pay only per result, export to JSON/CSV/Excel, schedule runs and call it from the API.
<!-- AFFILIATE_LINK_PLACEHOLDER: replace the Apify links above with the affiliate link when available -->

Runs **real Google Lighthouse audits** (the engine behind PageSpeed Insights) on a list of URLs. You get every result in one table: scores, Core Web Vitals, the biggest fixes, and optionally the full interactive HTML report. You don't need a Google API key or a PageSpeed quota.

## What you get for each URL
- **Scores (0–100):** performance, accessibility, best practices, SEO.
- **Lab metrics:** LCP, CLS, TBT, FCP, Speed Index, time to interactive, server response time (TTFB), total page weight, request count.
- **Top opportunities,** ranked by estimated savings, e.g. "Reduce unused JavaScript: 600 ms".
- **Failed audits** for accessibility, best practices and SEO, e.g. `image-alt`, `document-title`, `color-contrast`.
- **Optional full HTML report:** the same report Chrome DevTools produces, stored and linked from the results.
- **Device:** mobile (Lighthouse default throttling), desktop, or both.

## Use cases
- **SEO and web agencies:** benchmark a client's whole site or their competitors in one run, then export to Sheets or Excel.
- **Monitoring:** schedule a weekly run and alert when performance drops (works with webhooks, Make, Zapier and n8n).
- **E-commerce:** audit every category and product template before and after a release.
- **Accessibility triage:** find the pages with the most failing accessibility audits.

## Input
```json
{ "urls": ["https://example.com", "https://example.com/pricing"], "formFactor": "both", "categories": ["performance", "seo"], "saveHtmlReport": true }
```

## Output (one item per URL and device; example values)
```json
{
  "input": "https://example.com/", "formFactor": "mobile", "finalUrl": "https://example.com/",
  "scores": {"performance": 100, "accessibility": 96, "best-practices": 100, "seo": 80},
  "metrics": {"fcpMs": 841, "lcpMs": 841, "tbtMs": 0, "cls": 0, "speedIndexMs": 841, "ttfbMs": 35, "totalBytes": 1250, "requests": 2},
  "opportunities": [{"id": "unused-javascript", "title": "Reduce unused JavaScript", "savingsMs": 600}],
  "failedAudits": {"seo": [{"id": "meta-description", "title": "Document does not have a meta description"}]},
  "htmlReportUrl": "https://api.apify.com/v2/key-value-stores/.../records/report-...",
  "lighthouseVersion": "12.8.2"
}
```

## Pricing
Pay per event: **$0.008 per audit** (one URL on one device), plus $0.005 per run. For example, 100 URLs on mobile cost about $0.81. Unreachable pages and invalid URLs are **not charged**. Set "max cost per run" and the Actor stops cleanly at your budget.

## Notes on accuracy
- These are **lab** measurements from a cloud machine, comparable to PageSpeed Insights lab data but not identical. Scores vary run to run, as with any Lighthouse run. Keep `maxConcurrency` at 1 for the most stable numbers.
- Real-user field data (CrUX) is not included.
- Only public pages are audited. Logins aren't supported, and requests to private or internal addresses are refused.

*This Actor was built and is maintained with AI assistance. Report issues on the Issues tab; they are monitored daily.*

## Run from source
This repository is the full source of the [Lighthouse Bulk Audit: Core Web Vitals & SEO Scores](https://apify.com/manageable_gully/lighthouse-bulk-audit) Actor.

```bash
npm install
npm test
# run locally with the Apify CLI (https://docs.apify.com/cli):
apify run --input '{...}'
```

Deploy your own copy with `apify push`. The easiest way to use it is the hosted version on the [Apify Store](https://apify.com/manageable_gully/lighthouse-bulk-audit).

<!-- AFFILIATE_LINK_PLACEHOLDER: "New to Apify? Sign up here" link goes here -->

## License
MIT, see [LICENSE](LICENSE).
