// Core Lighthouse logic, independent of the Apify SDK (unit-testable).
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

export const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const METRICS = {
    'first-contentful-paint': 'fcpMs',
    'largest-contentful-paint': 'lcpMs',
    'total-blocking-time': 'tbtMs',
    'cumulative-layout-shift': 'cls',
    'speed-index': 'speedIndexMs',
    interactive: 'ttiMs',
    'server-response-time': 'ttfbMs',
};

export function normalizeUrl(raw) {
    let s = String(raw ?? '').trim();
    if (!s) throw new Error('empty URL');
    if (!/^[a-z]+:\/\//i.test(s)) s = `https://${s}`;
    const u = new URL(s);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error(`Unsupported scheme: ${u.protocol}`);
    if (!/^[a-z0-9.-]+$/i.test(u.hostname) && !u.hostname.startsWith('[')) throw new Error(`Invalid host: ${u.hostname}`);
    u.hash = '';
    return u.toString();
}

export function parseInput(input = {}) {
    const raw = [...(input.urls ?? []), ...(input.startUrls ?? []).map((s) => (typeof s === 'string' ? s : s?.url))];
    const urls = [];
    const invalid = [];
    for (const r of raw) {
        if (!r || !String(r).trim()) continue;
        try {
            const n = normalizeUrl(r);
            if (!urls.includes(n)) urls.push(n);
        } catch (e) {
            invalid.push({ input: r, error: e.message });
        }
    }
    if (!urls.length && !invalid.length) throw new Error('Provide at least one URL in "urls".');
    if (urls.length > 5000) throw new Error('At most 5000 URLs per run.');
    const ff = input.formFactor ?? 'mobile';
    const formFactors = ff === 'both' ? ['mobile', 'desktop'] : [ff];
    if (!formFactors.every((f) => ['mobile', 'desktop'].includes(f))) throw new Error('formFactor must be mobile, desktop or both');
    const categories = (input.categories?.length ? input.categories : CATEGORIES);
    if (!categories.every((c) => CATEGORIES.includes(c))) throw new Error(`categories must be from ${CATEGORIES.join(', ')}`);
    return {
        urls,
        invalid,
        formFactors,
        categories,
        saveHtmlReport: Boolean(input.saveHtmlReport ?? false),
        maxConcurrency: Math.min(Math.max(Number(input.maxConcurrency ?? 1), 1), 4),
        timeoutSecs: Math.min(Math.max(Number(input.timeoutSecs ?? 90), 30), 300),
    };
}

export async function launchChrome() {
    const chromePath = process.env.CHROME_PATH || process.env.APIFY_CHROME_EXECUTABLE_PATH || undefined;
    return chromeLauncher.launch({
        chromePath,
        chromeFlags: ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run'],
    });
}

const round = (v, d = 0) => (typeof v === 'number' ? Number(v.toFixed(d)) : null);

export function summarize(lhr, formFactor) {
    const scores = {};
    for (const [id, cat] of Object.entries(lhr.categories)) scores[id] = cat.score == null ? null : Math.round(cat.score * 100);
    const metrics = {};
    for (const [auditId, key] of Object.entries(METRICS)) {
        const a = lhr.audits[auditId];
        metrics[key] = a ? round(a.numericValue, key === 'cls' ? 3 : 0) : null;
    }
    metrics.totalBytes = round(lhr.audits['total-byte-weight']?.numericValue);
    metrics.requests = lhr.audits['network-requests']?.details?.items?.length ?? null;
    const opportunities = Object.values(lhr.audits)
        .filter((a) => a.details?.type === 'opportunity' && (a.details.overallSavingsMs > 0 || a.details.overallSavingsBytes > 0) && (a.score ?? 1) < 0.9)
        .sort((a, b) => (b.details.overallSavingsMs ?? 0) - (a.details.overallSavingsMs ?? 0))
        .slice(0, 8)
        .map((a) => ({ id: a.id, title: a.title, savingsMs: round(a.details.overallSavingsMs), savingsBytes: round(a.details.overallSavingsBytes) }));
    const failed = {};
    for (const [cid, cat] of Object.entries(lhr.categories)) {
        if (cid === 'performance') continue;
        failed[cid] = cat.auditRefs
            .map((r) => lhr.audits[r.id])
            .filter((a) => a && a.score !== null && a.score < 0.9 && a.scoreDisplayMode !== 'informative' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'manual')
            .slice(0, 15)
            .map((a) => ({ id: a.id, title: a.title }));
    }
    return {
        formFactor,
        requestedUrl: lhr.requestedUrl,
        finalUrl: lhr.finalDisplayedUrl ?? lhr.finalUrl,
        scores,
        metrics,
        opportunities,
        failedAudits: failed,
        runWarnings: (lhr.runWarnings ?? []).slice(0, 5),
        runtimeError: lhr.runtimeError?.message ?? null,
        lighthouseVersion: lhr.lighthouseVersion,
        fetchedAt: lhr.fetchTime,
    };
}

export async function auditUrl(url, { port, formFactor = 'mobile', categories = CATEGORIES, timeoutSecs = 90, wantHtml = false }) {
    const flags = {
        port,
        output: wantHtml ? ['json', 'html'] : 'json',
        logLevel: 'error',
        onlyCategories: categories,
        maxWaitForLoad: timeoutSecs * 1000,
    };
    const config = formFactor === 'desktop' ? desktopConfig : undefined;
    let timer;
    const timeout = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`Lighthouse timed out after ${timeoutSecs + 30}s`)), (timeoutSecs + 30) * 1000); });
    try {
        const result = await Promise.race([lighthouse(url, flags, config), timeout]);
        if (!result?.lhr) throw new Error('Lighthouse returned no result');
        const summary = summarize(result.lhr, formFactor);
        const html = wantHtml ? (Array.isArray(result.report) ? result.report[1] : null) : null;
        return { summary, html };
    } finally {
        clearTimeout(timer);
    }
}
