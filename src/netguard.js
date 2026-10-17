// Refuse private / loopback / link-local / reserved targets (SSRF guard).
import { lookup } from 'node:dns/promises';
import net from 'node:net';

const V4_BLOCKS = [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
    ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['224.0.0.0', 4], ['240.0.0.0', 4],
];
const toInt = (ip) => ip.split('.').reduce((a, o) => (a << 8) + Number(o), 0) >>> 0;

export function isPublicIp(ip) {
    if (net.isIPv4(ip)) {
        const n = toInt(ip);
        return !V4_BLOCKS.some(([base, bits]) => (n >>> (32 - bits)) === (toInt(base) >>> (32 - bits)));
    }
    const l = ip.toLowerCase();
    if (l.startsWith('::ffff:')) return isPublicIp(l.slice(7));
    return !(l === '::' || l === '::1' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe8')
        || l.startsWith('fe9') || l.startsWith('fea') || l.startsWith('feb') || l.startsWith('ff'));
}

export async function assertPublicUrl(url, { allowPrivate = false } = {}) {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error(`Unsupported scheme: ${u.protocol}`);
    if (allowPrivate) return;
    const host = u.hostname.replace(/^\[|\]$/g, '');
    const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    const bad = addrs.find((a) => !isPublicIp(a.address));
    if (bad) throw new Error(`${host} resolves to non-public address ${bad.address}`);
}
