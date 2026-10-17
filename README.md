# Lighthouse & PageSpeed Bulk Audit: Core Web Vitals, SEO & Accessibility Scores for Many URLs

[![Run on Apify](https://img.shields.io/badge/Run%20on-Apify-1f6feb?logo=apify)](https://apify.com/manageable_gully/lighthouse-bulk-audit) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Run it in the cloud with no setup:** [Lighthouse & PageSpeed Bulk Audit: Core Web Vitals, SEO on the Apify Store](https://apify.com/manageable_gully/lighthouse-bulk-audit).  
> Pay only per result, export to JSON/CSV/Excel, schedule runs and call it from the API.
<!-- AFFILIATE_LINK_PLACEHOLDER: replace the Apify links above with the affiliate link when available -->

Runs **real Google Lighthouse audits** (the engine behind PageSpeed Insights) on a list of URLs. You get every result in one table: scores, Core Web Vitals, the biggest fixes, and optionally the full interactive HTML report. You don't need a Google API key or a PageSpeed quota.

## What you can use it for
- **SEO and web agencies:** benchmark a client's whole site or their competitors in one run, then export to Sheets or Excel.
- **Monitoring:** schedule a weekly run and alert when performance drops (works with webhooks, Make, Zapier and n8n).
- **E-commerce:** audit every category and product template before and after a release.
- **Accessibility triage:** find the pages with the most failing accessibility audits.

## How to use it
1. Paste your URLs under **URLs** (whole sitemaps work fine).
2. Choose **mobile**, **desktop** or **both**, and the categories you need.
3. Optionally turn on **Save HTML report** for the full Lighthouse report per URL.
4. Click **Start** and sort the table by `scores.performance` or `metrics.lcpMs`.

## What you get for each URL
- **Scores (0–100):** performance, accessibility, best practices, SEO.
- **Lab metrics:** LCP, CLS, TBT, FCP, Speed Index, time to interactive, server response time (TTFB), total page weight, request count.
- **Top opportunities,** ranked by estimated savings, e.g. "Reduce unused JavaScript: 600 ms".
- **Failed audits** for accessibility, best practices and SEO, e.g. `image-alt`, `document-title`, `color-contrast`.
- **Optional full HTML report:** the same report Chrome DevTools produces, stored and linked from the results.
- **Device:** mobile (Lighthouse default throttling), desktop, or both.

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

## Notes on accuracy
- These are **lab** measurements from a cloud machine, comparable to PageSpeed Insights lab data but not identical. Scores vary run to run, as with any Lighthouse run. Keep `maxConcurrency` at 1 for the most stable numbers.
- Real-user field data (CrUX) is not included.
- Only public pages are audited. Logins aren't supported, and requests to private or internal addresses are refused.

## Pricing
Pay per event, no monthly rent: **$0.008 per audit** (**$8.00 per 1,000**), plus $0.005 per run start.

| Example | Cost |
|---|---|
| 100 URLs on mobile | $0.805 |
| 1,000 URLs on mobile | $8.01 |
| 100 URLs on mobile + desktop (200 audits) | $1.60 |

Unreachable pages and invalid URLs are **not charged**.

You can set a **maximum cost per run** in the run options; the Actor stops cleanly when it is reached. New to Apify? The free plan includes $5 of platform credit every month, so you can try this Actor at no cost.

## API, integrations and AI agents (MCP)
Run it from your own code with the [Apify API](https://docs.apify.com/api/v2) and get the results in one call:
```bash
curl -X POST "https://api.apify.com/v2/acts/manageable_gully~lighthouse-bulk-audit/run-sync-get-dataset-items?token=<YOUR_APIFY_TOKEN>" \
  -H "Content-Type: application/json" -d @input.json
```
```python
from apify_client import ApifyClient
run = ApifyClient("<YOUR_APIFY_TOKEN>").actor("manageable_gully/lighthouse-bulk-audit").call(run_input={...})
```
- **No-code:** use the Apify app in **n8n, Make or Zapier** ("Run Actor", then "Get dataset items"), or send results to Google Sheets, Slack or a webhook.
- **AI agents (MCP):** add `https://mcp.apify.com?tools=manageable_gully/lighthouse-bulk-audit` to Claude, Cursor, VS Code or any MCP client and the agent can call this Actor as a tool.
- **Schedules:** run it hourly, daily or weekly from Apify Console.

## FAQ
**Is this the same as PageSpeed Insights?** It runs the same Lighthouse engine that PageSpeed Insights uses for its lab data, without the PSI API quota. Field data from real Chrome users (CrUX) is not included.

**Do I need a Google API key?** No. Lighthouse runs inside the Actor in headless Chrome.

**Why do scores differ slightly between runs?** Lighthouse lab scores always vary a little. For the most stable numbers keep `maxConcurrency` at 1 and compare medians over a few runs.

**Can AI agents use it?** Yes. It is available as a tool through the Apify MCP server (`https://mcp.apify.com?tools=manageable_gully/lighthouse-bulk-audit`) and the Apify API, and it returns structured JSON that agents can read directly.

## More tools from WebIntel Tools
- [SEO Audit & Domain Checker](https://apify.com/manageable_gully/website-health-audit): SEO, DNS, SSL and security-header audit for lists of domains
- [Broken Link Checker](https://apify.com/manageable_gully/broken-link-checker): crawl a site and find every 404, broken image and bad redirect
- [Website Screenshot & URL to PDF](https://apify.com/manageable_gully/url-to-pdf-screenshot): full-page screenshots and PDFs of URLs or your own HTML
- [Website Tech Stack Detector](https://apify.com/manageable_gully/website-tech-detector): BuiltWith/Wappalyzer-style tech stack lookup in bulk

See [all WebIntel Tools Actors](https://apify.com/manageable_gully).

*Made by WebIntel Tools. This Actor was built and is maintained with AI assistance. Report issues on the Issues tab; they are monitored daily.*

## Run from source
This repository is the full source of the [Lighthouse & PageSpeed Bulk Audit: Core Web Vitals, SEO](https://apify.com/manageable_gully/lighthouse-bulk-audit) Actor.

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
