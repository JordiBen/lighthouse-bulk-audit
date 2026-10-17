// Apify entrypoint: bulk Lighthouse audits.
import { Actor, log } from 'apify';
import { auditUrl, launchChrome, parseInput } from './audit.js';
import { assertPublicUrl } from './netguard.js';

const EVENT = 'url-audited';

await Actor.init();
try {
    const input = (await Actor.getInput()) ?? {};
    let cfg;
    try {
        cfg = parseInput(input);
    } catch (e) {
        await Actor.fail(e.message);
    }
    const allowPrivate = process.env.ALLOW_PRIVATE_NETWORK_FOR_LOCAL_DEV === '1' && !Actor.isAtHome();
    for (const bad of cfg.invalid) await Actor.pushData({ input: bad.input, error: bad.error });

    const jobs = cfg.urls.flatMap((url) => cfg.formFactors.map((formFactor) => ({ url, formFactor })));
    log.info(`Running ${jobs.length} Lighthouse audit(s) with ${cfg.maxConcurrency} Chrome instance(s)`);
    let next = 0;
    let done = 0;
    let budgetHit = false;

    const worker = async () => {
        let chrome = await launchChrome();
        try {
            while (!budgetHit && next < jobs.length) {
                const { url, formFactor } = jobs[next++];
                const item = { input: url, formFactor };
                try {
                    await assertPublicUrl(url, { allowPrivate });
                    const { summary, html } = await auditUrl(url, { port: chrome.port, formFactor, categories: cfg.categories, timeoutSecs: cfg.timeoutSecs, wantHtml: cfg.saveHtmlReport });
                    Object.assign(item, summary);
                    if (summary.runtimeError && Object.values(summary.scores).every((v) => v === null)) {
                        throw Object.assign(new Error(`Page could not be audited: ${summary.runtimeError}`), { keepChrome: true });
                    }
                    if (html) {
                        const key = `report-${Buffer.from(`${url}|${formFactor}`).toString('base64url').slice(0, 200)}`;
                        await Actor.setValue(key, html, { contentType: 'text/html; charset=utf-8' });
                        const store = await Actor.openKeyValueStore();
                        item.htmlReportUrl = store.getPublicUrl ? store.getPublicUrl(key) : key;
                    }
                } catch (e) {
                    item.error = String(e?.message ?? e).slice(0, 300);
                    if (!e?.keepChrome) {
                        // Chrome may be wedged after a crash/timeout: restart it.
                        try { await chrome.kill(); } catch { /* ignore */ }
                        chrome = await launchChrome();
                    }
                }
                // Charge only for completed audits; failed/unreachable pages are free.
                if (!item.error) {
                    const res = await Actor.charge({ eventName: EVENT });
                    if (res.chargedCount === 0 && res.eventChargeLimitReached) { budgetHit = true; break; }
                    await Actor.pushData(item);
                    if (res.eventChargeLimitReached) budgetHit = true;
                } else {
                    await Actor.pushData(item);
                }
                done += 1;
                await Actor.setStatusMessage(`Audited ${done}/${jobs.length}`);
            }
        } finally {
            try { await chrome.kill(); } catch { /* ignore */ }
        }
    };
    await Promise.all(Array.from({ length: Math.min(cfg.maxConcurrency, jobs.length) }, worker));
    await Actor.setStatusMessage(`Done: ${done}/${jobs.length} audits${budgetHit ? ' (stopped: max charge reached)' : ''}`, { isStatusMessageTerminal: true });
} catch (e) {
    log.exception(e, 'Run failed');
    await Actor.fail(String(e?.message ?? e));
}
await Actor.exit();
