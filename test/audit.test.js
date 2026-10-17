import assert from 'node:assert/strict';
import http from 'node:http';
import { after, before, describe, it } from 'node:test';
import { auditUrl, launchChrome, normalizeUrl, parseInput, summarize } from '../src/audit.js';
import { assertPublicUrl, isPublicIp } from '../src/netguard.js';

const PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Test page for Lighthouse</title>
<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="description" content="A small test page used by the automated test-suite.">
</head><body><h1>Hello</h1><p>Some content.</p><img src="/x.png"><a href="/next">next</a></body></html>`;

describe('pure helpers', () => {
    it('normalizes URLs', () => {
        assert.equal(normalizeUrl('example.com'), 'https://example.com/');
        assert.equal(normalizeUrl('http://a.bc/x#y'), 'http://a.bc/x');
        assert.throws(() => normalizeUrl('ftp://x.y'));
        assert.throws(() => normalizeUrl('not a host!'));
    });
    it('parses input', () => {
        const c = parseInput({ urls: ['a.com', 'https://a.com/', 'bad host!'], formFactor: 'both', maxConcurrency: 99 });
        assert.deepEqual(c.urls, ['https://a.com/']);
        assert.equal(c.invalid.length, 1);
        assert.deepEqual(c.formFactors, ['mobile', 'desktop']);
        assert.equal(c.maxConcurrency, 4);
        assert.throws(() => parseInput({ urls: [] }));
        assert.throws(() => parseInput({ urls: ['a.com'], categories: ['pwa'] }));
    });
    it('ssrf guard', async () => {
        assert.equal(isPublicIp('8.8.8.8'), true);
        for (const ip of ['127.0.0.1', '10.1.2.3', '169.254.169.254', '192.168.1.1', '::1', 'fd00::1', '198.18.0.1']) assert.equal(isPublicIp(ip), false, ip);
        await assert.rejects(assertPublicUrl('http://127.0.0.1/'), /non-public/);
        await assert.rejects(assertPublicUrl('file:///etc/passwd'), /scheme/);
    });
    it('summarizes a minimal LHR', () => {
        const lhr = {
            requestedUrl: 'https://x/', finalDisplayedUrl: 'https://x/', lighthouseVersion: '12', fetchTime: 't',
            categories: { performance: { score: 0.91, auditRefs: [] }, seo: { score: 0.5, auditRefs: [{ id: 'document-title' }, { id: 'ok' }] } },
            audits: {
                'largest-contentful-paint': { numericValue: 2501.4 }, 'cumulative-layout-shift': { numericValue: 0.12345 },
                'document-title': { id: 'document-title', title: 'Has title', score: 0, scoreDisplayMode: 'binary' },
                ok: { id: 'ok', title: 'fine', score: 1, scoreDisplayMode: 'binary' },
                'unused-javascript': { id: 'unused-javascript', title: 'Reduce unused JS', score: 0.3, details: { type: 'opportunity', overallSavingsMs: 600, overallSavingsBytes: 1000 } },
            },
        };
        const s = summarize(lhr, 'mobile');
        assert.deepEqual(s.scores, { performance: 91, seo: 50 });
        assert.equal(s.metrics.lcpMs, 2501);
        assert.equal(s.metrics.cls, 0.123);
        assert.deepEqual(s.failedAudits.seo, [{ id: 'document-title', title: 'Has title' }]);
        assert.equal(s.opportunities[0].id, 'unused-javascript');
    });
});

describe('real Lighthouse run against a local page', { timeout: 240000 }, () => {
    let server; let base; let chrome;
    before(async () => {
        server = http.createServer((req, res) => {
            if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
            res.writeHead(404); res.end();
        });
        await new Promise((r) => server.listen(0, '127.0.0.1', r));
        base = `http://127.0.0.1:${server.address().port}/`;
        chrome = await launchChrome();
    });
    after(async () => { await chrome?.kill(); server?.close(); });

    it('audits mobile with all categories and an HTML report', async () => {
        const { summary, html } = await auditUrl(base, { port: chrome.port, formFactor: 'mobile', wantHtml: true, timeoutSecs: 60 });
        for (const c of ['performance', 'accessibility', 'best-practices', 'seo']) {
            assert.ok(Number.isInteger(summary.scores[c]) && summary.scores[c] >= 0 && summary.scores[c] <= 100, `${c}=${summary.scores[c]}`);
        }
        assert.ok(summary.metrics.fcpMs > 0 && summary.metrics.lcpMs > 0);
        assert.ok(summary.failedAudits.accessibility.some((a) => a.id === 'image-alt'), 'flags img without alt');
        assert.equal(summary.formFactor, 'mobile');
        assert.ok(html && html.includes('<html') && html.length > 10000);
    });

    it('audits desktop for a subset of categories', async () => {
        const { summary } = await auditUrl(base, { port: chrome.port, formFactor: 'desktop', categories: ['seo'], timeoutSecs: 60 });
        assert.deepEqual(Object.keys(summary.scores), ['seo']);
        assert.equal(summary.formFactor, 'desktop');
    });

    it('reports a runtime error for an unreachable page', async () => {
        const { summary } = await auditUrl('http://127.0.0.1:9/', { port: chrome.port, categories: ['seo'], timeoutSecs: 30 });
        assert.ok(summary.runtimeError, 'expected runtimeError');
    });
});
