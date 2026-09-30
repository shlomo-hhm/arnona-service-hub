#!/usr/bin/env node
// Dead-link checker for every service URL in src/data/forms.ts.
// Zero dependencies (Node >= 18, uses global fetch). Never modifies forms.ts.
//
// Usage:  node scripts/check-links.mjs [--report=link-report.md] [--json=link-report.json] [--issue]
//   --issue  also open/update/close the single "broken-links" GitHub issue via the `gh` CLI
//            (in Actions it uses GH_TOKEN, locally your `gh auth login`). No other secrets.
//
// Per URL: HEAD first, GET fallback (many servers answer HEAD with 403/404/405),
// redirects followed, per-request timeout, one retry for transient failures,
// polite pacing (small concurrency + delay between requests to the same host).
//
// Result classes:
//   ok           2xx after redirects (+ form-bundle check for the jeronlineforms soft-404 host)
//   broken       404/410, other 4xx (except 401/403/408/429), DNS failure, connection refused,
//                TLS/cert errors, or a redirect loop
//   unverified   403/401/429/5xx/timeouts: the site blocked us or is flaky, a human should look.
//                Israeli government sites sometimes block foreign (GitHub runner) IPs.
// Only "broken" makes the workflow open/update an issue; "unverified" is listed inside it.
//
// Output for GitHub Actions: writes to $GITHUB_OUTPUT (broken=N, unverified=M) when present.

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const FORMS = resolve(here, '../src/data/forms.ts');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const REPORT = args.report || 'link-report.md';
const JSON_OUT = args.json || 'link-report.json';

const TIMEOUT_MS = 20_000;
const CONCURRENCY = 3;
const HOST_DELAY_MS = 750; // minimum gap between requests to the same host
const MAX_REDIRECTS = 8;
// The municipality's CDN (Akamai bot manager) answers 403 to any UA that looks like a bot
// ("...link-checker/1.0"), but serves normal browser UAs. So we send a browser-style UA plus a
// header that says who we are. Volume is tiny (~40 requests/week, ~1 per second per host).
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

// ---- 1. extract services (id, title, url) from forms.ts -------------------
function extractServices(src) {
  const out = [];
  // Each service object has id: '...' first and url: '...' later. Walk line by line.
  let cur = null;
  for (const line of src.split(/\r?\n/)) {
    let m = line.match(/^\s{4}id:\s*'([^']+)'/);
    if (m) {
      cur = { id: m[1], title: '', url: '' };
      out.push(cur);
      continue;
    }
    if (!cur) continue;
    m = line.match(/^\s{4}title:\s*'((?:[^'\\]|\\.)*)'/);
    if (m) cur.title = m[1].replace(/\\'/g, "'");
    m = line.match(/^\s{4}url:\s*'([^']*)'/);
    if (m) cur.url = m[1];
  }
  return out;
}

const services = extractServices(readFileSync(FORMS, 'utf8'));
if (services.length === 0 || services.some((s) => !s.url)) {
  console.error('Parser problem: expected every service to have an id and a url.', {
    found: services.length,
    withoutUrl: services.filter((s) => !s.url).map((s) => s.id),
  });
  process.exit(2);
}

// ---- 2. network helpers ---------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastHit = new Map(); // host -> timestamp (ms) of last request start

async function polite(url) {
  const host = new URL(url).host;
  const wait = (lastHit.get(host) ?? 0) + HOST_DELAY_MS - Date.now();
  lastHit.set(host, Math.max(Date.now(), (lastHit.get(host) ?? 0) + HOST_DELAY_MS));
  if (wait > 0) await sleep(wait);
}

async function request(method, url) {
  // Follow redirects manually so we can count hops and detect loops.
  let current = url;
  const seen = new Set();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (seen.has(current)) return { error: 'redirect loop', finalUrl: current };
    seen.add(current);
    await polite(current);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    let res;
    try {
      res = await fetch(current, {
        method,
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'user-agent': UA, 'x-link-checker': 'github.com/shlomo-hhm/arnona-service-hub', accept: 'text/html,application/pdf,*/*;q=0.8', 'accept-language': 'he,en;q=0.8' },
      });
    } catch (e) {
      clearTimeout(timer);
      const cause = e?.cause?.code || e?.cause?.message || e?.name || String(e);
      return { error: e?.name === 'AbortError' ? 'timeout' : String(cause), finalUrl: current };
    }
    clearTimeout(timer);
    try {
      await res.body?.cancel();
    } catch {
      /* ignore */
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      current = new URL(res.headers.get('location'), current).toString();
      continue;
    }
    return { status: res.status, finalUrl: current, hops: hop };
  }
  return { error: 'too many redirects', finalUrl: current };
}

function classify(r) {
  if (r.error) {
    if (r.error === 'timeout') return 'unverified';
    if (/ENOTFOUND|ECONNREFUSED|CERT|SSL|TLS|redirect|self.signed|expired/i.test(r.error)) return 'broken';
    return 'unverified';
  }
  const s = r.status;
  if (s >= 200 && s < 300) return 'ok';
  if (s === 404 || s === 410) return 'broken';
  if (s === 401 || s === 403 || s === 408 || s === 429 || s >= 500) return 'unverified';
  if (s >= 400) return 'broken';
  return 'unverified';
}

async function check(url) {
  let r = await request('HEAD', url);
  let method = 'HEAD';
  if (classify(r) !== 'ok') {
    // HEAD is often unsupported/blocked; retry with GET before judging.
    const g = await request('GET', url);
    method = 'GET';
    r = g;
    if (classify(r) === 'unverified') {
      // one retry after a pause for transient errors (5xx/timeout/rate-limit)
      await sleep(3000);
      r = await request('GET', url);
    }
  }
  let cls = classify(r);
  const notes = [];
  // jeronlineforms.jerusalem.muni.il is an Angular shell: EVERY path returns HTTP 200, even unknown
  // forms. But each real form ships /Scripts/<FormName>/styles.css (404 for unknown names), so we
  // verify that asset. Limitation: query strings (e.g. ?DiscountType=999) can't be validated this way.
  if (cls === 'ok' && !r.error) {
    try {
      const f = new URL(r.finalUrl);
      const seg = f.pathname.split('/').filter(Boolean)[0];
      if (f.host === 'jeronlineforms.jerusalem.muni.il' && seg) {
        const a = await request('GET', `${f.origin}/Scripts/${seg}/styles.css`);
        if (a.status === 404 || a.status === 410) {
          cls = 'broken';
          r = { ...r, error: `soft-404: page returns 200 but form bundle /Scripts/${seg}/ does not exist` };
        } else if (a.error || (a.status && a.status >= 400)) {
          notes.push(`could not verify form bundle (${a.error || 'HTTP ' + a.status})`);
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (!r.error && r.finalUrl !== url) {
    notes.push(`redirects to ${r.finalUrl}`);
    try {
      const a = new URL(url);
      const b = new URL(r.finalUrl);
      if (cls === 'ok' && b.pathname.replace(/\/+$/, '') === '' && a.pathname.replace(/\/+$/, '') !== '') {
        notes.push('WARNING: redirected to the site root (page may have been removed)');
      }
    } catch {
      /* ignore */
    }
  }
  return { class: cls, status: r.status ?? null, error: r.error ?? null, method, finalUrl: r.finalUrl, notes };
}

// ---- 3. run with small concurrency ---------------------------------------
const results = new Array(services.length);
let next = 0;
async function worker() {
  while (true) {
    const i = next++;
    if (i >= services.length) return;
    const s = services[i];
    const r = await check(s.url);
    results[i] = { id: s.id, title: s.title, url: s.url, ...r };
    const tag = r.class === 'ok' ? 'OK        ' : r.class === 'broken' ? 'BROKEN    ' : 'UNVERIFIED';
    console.log(`${tag} ${String(r.status ?? r.error).padEnd(10)} ${s.id}  ${s.url}${r.notes.length ? '  [' + r.notes.join('; ') + ']' : ''}`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// ---- 4. report ------------------------------------------------------------
const broken = results.filter((r) => r.class === 'broken');
const unverified = results.filter((r) => r.class === 'unverified');
const warnings = results.filter((r) => r.class === 'ok' && r.notes.some((n) => n.startsWith('WARNING')));
const ok = results.filter((r) => r.class === 'ok');
const when = new Date().toISOString();
const cell = (s) => String(s).replace(/\|/g, '\\|');
const reason = (r) => (r.error ? r.error : `HTTP ${r.status}`) + (r.method ? ` (${r.method})` : '');

let md = `# Link check report\n\nChecked ${results.length} service URLs from \`src/data/forms.ts\` at ${when}.\n\n`;
md += `- OK: **${ok.length}**\n- Broken: **${broken.length}**\n- Could not verify (blocked/timeout/5xx): **${unverified.length}**\n- OK but redirected to site root: **${warnings.length}**\n\n`;
const table = (rows) =>
  '| Service id | Title | Result | URL |\n|---|---|---|---|\n' +
  rows.map((r) => `| \`${r.id}\` | ${cell(r.title)} | ${cell(reason(r))} | ${r.url} |`).join('\n') +
  '\n\n';
if (broken.length) md += `## Broken links (${broken.length})\n\nFix the URL in \`src/data/forms.ts\` from the official municipal source (never guess), or set \`verified: false\`.\n\n` + table(broken);
if (unverified.length)
  md += `## Could not verify (${unverified.length})\n\nThe server refused automated requests (403/429), timed out, or returned 5xx. Open these by hand. If most of the list is here, the municipality is probably blocking GitHub runner IPs (non-Israeli), not a real outage.\n\n` + table(unverified);
if (warnings.length)
  md += `## Redirected to site root (${warnings.length})\n\n` +
    '| Service id | URL | Final URL |\n|---|---|---|\n' +
    warnings.map((r) => `| \`${r.id}\` | ${r.url} | ${r.finalUrl} |`).join('\n') +
    '\n\n';
if (!broken.length && !unverified.length) md += 'All links responded OK.\n';

writeFileSync(REPORT, md, 'utf8');
writeFileSync(JSON_OUT, JSON.stringify({ checkedAt: when, results }, null, 2), 'utf8');
console.log(`\nSummary: ${ok.length} ok, ${broken.length} broken, ${unverified.length} unverified, ${warnings.length} root-redirect warnings. Report: ${REPORT}`);

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `broken=${broken.length}\nunverified=${unverified.length}\n`);
}
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}

// ---- 5. GitHub issue (optional) --------------------------------------------
// GitHub-hosted runners are US/Azure IPs and the municipal CDN (Akamai) answers 403 to all of them,
// even to a real Chromium (verified 2026-09-30). If (almost) everything is 403 we treat the run as
// "blocked": we neither open nor close an issue, because we learned nothing about the links.
const NL = String.fromCharCode(10);
const blocked403 = unverified.length; // 403s and network errors alike: we learned nothing
const blockedRun = results.length > 0 && blocked403 / results.length >= 0.9;
if (blockedRun) {
  const msg = `BLOCKED: ${blocked403}/${results.length} URLs could not be verified (403 or network errors; typically this machine's IP is blocked by the municipal CDN, or the network is down). Nothing verified; issue left untouched. Run it from an Israeli IP (see README).`;
  console.log(NL + msg);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${NL}> **${msg}**${NL}`);
}
if (args.issue && !blockedRun) {
  const gh = (a, input) => {
    const r = spawnSync('gh', a, { encoding: 'utf8', input });
    if (r.status !== 0) throw new Error(`gh ${a.join(' ')} failed: ${r.stderr || r.error}`);
    return r.stdout.trim();
  };
  const LABEL = 'broken-links';
  const runUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : 'a manual run';
  try {
    spawnSync('gh', ['label', 'create', LABEL, '--color', 'B60205', '--description', 'Dead service URLs found by the link checker'], { encoding: 'utf8' });
    const existing = gh(['issue', 'list', '--label', LABEL, '--state', 'open', '--json', 'number', '--jq', '.[0].number // empty']);
    if (broken.length) {
      const body = [
        `Automated link check found **${broken.length} broken** link(s) (and ${unverified.length} that could not be verified).`,
        '',
        `Source: ${runUrl}. This issue is updated on every run and closes itself when all links are fine.`,
        '',
        ...md.split(NL).slice(1),
      ].join(NL);
      if (existing) {
        gh(['issue', 'edit', existing, '--body-file', '-'], body);
        console.log(`Updated issue #${existing}`);
      } else {
        console.log(gh(['issue', 'create', '--title', 'Broken service links (automated link check)', '--label', LABEL, '--body-file', '-'], body));
      }
    } else if (existing) {
      gh(['issue', 'comment', existing, '--body', `All links are OK again as of ${runUrl}. Closing.`]);
      gh(['issue', 'close', existing]);
      console.log(`Closed issue #${existing}`);
    } else {
      console.log('No broken links and no open issue. Nothing to do.');
    }
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(3);
  }
}
