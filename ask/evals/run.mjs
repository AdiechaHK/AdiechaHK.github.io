#!/usr/bin/env node
/**
 * Eval runner for ask-hk.
 *
 * Usage:
 *   ENDPOINT=https://ask-hk.<subdomain>.workers.dev node evals/run.mjs
 *   ENDPOINT=http://127.0.0.1:8787 node evals/run.mjs --suite prompt-injection
 *   ... --json report.json
 *
 * Exit code is non-zero if any case fails, so this can gate a deploy in CI.
 *
 * Cost note: a full run is ~34 questions ≈ 730 neurons, about 7% of the daily
 * free allocation. Run it on corpus or prompt changes, not on every commit.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ENDPOINT = process.env.ENDPOINT;
if (!ENDPOINT) { console.error('Set ENDPOINT to the deployed Worker URL.'); process.exit(1); }

const args = process.argv.slice(2);
const only = args.includes('--suite') ? args[args.indexOf('--suite') + 1] : null;
const jsonOut = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;

const REFUSAL_MARKERS = [
  "don't have a note", 'do not have a note', "don't have information", 'not something i',
  "isn't covered", 'is not covered', "can't help with that", 'cannot help with that',
  'adiechahari@gmail.com', "i don't know", 'i do not know',
];

const c = { g:s=>`\x1b[32m${s}\x1b[0m`, r:s=>`\x1b[31m${s}\x1b[0m`,
            y:s=>`\x1b[33m${s}\x1b[0m`, d:s=>`\x1b[2m${s}\x1b[0m`, b:s=>`\x1b[1m${s}\x1b[0m` };

async function askOnce(question) {
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  const latency = Date.now() - t0;
  let body;
  try { body = await res.json(); } catch { body = { error: 'unparseable' }; }
  return { status: res.status, latency, ...body };
}

function evaluate(tc, r) {
  const fails = [];
  const answer = (r.answer || r.message || '').toLowerCase();

  if (r.status >= 500) fails.push(`server error ${r.status}`);

  if (tc.expect_sources) {
    const got = (r.sources || []).map(s => s.id);
    const hit = tc.expect_sources.some(id => got.includes(id));
    if (!hit && r.grounded !== false) {
      fails.push(`sources: wanted one of [${tc.expect_sources}], got [${got.join(',') || 'none'}]`);
    }
    if (!hit && r.grounded === false) {
      fails.push(`refused, but expected retrieval to hit [${tc.expect_sources}]`);
    }
  }

  if (tc.expect_refusal) {
    const refused = r.grounded === false || REFUSAL_MARKERS.some(m => answer.includes(m));
    if (!refused) fails.push('expected a refusal / hand-off, got a substantive answer');
  }

  for (const m of tc.must_include || []) {
    if (!answer.includes(m.toLowerCase())) fails.push(`missing required: "${m}"`);
  }
  for (const m of tc.must_not_include || []) {
    if (answer.includes(m.toLowerCase())) fails.push(`contains forbidden: "${m}"`);
  }
  return fails;
}

const spec = JSON.parse(await readFile(resolve(__dir, 'cases.json'), 'utf8'));
const suites = spec.suites.filter(s => !only || s.name === only);

let pass = 0, fail = 0;
const latencies = [];
const report = { endpoint: ENDPOINT, ran: new Date().toISOString(), suites: [] };

console.log(c.b(`\nask-hk evals → ${ENDPOINT}\n`));

for (const suite of suites) {
  console.log(c.b(suite.name) + c.d(`  ${suite.note || ''}`));
  const sr = { name: suite.name, cases: [] };

  for (const tc of suite.cases) {
    const r = await askOnce(tc.q);
    latencies.push(r.latency);
    const fails = evaluate(tc, r);
    const ok = fails.length === 0;
    ok ? pass++ : fail++;

    console.log(`  ${ok ? c.g('PASS') : c.r('FAIL')}  ${tc.q}  ${c.d(r.latency + 'ms')}`);
    for (const f of fails) console.log(c.r(`        ↳ ${f}`));
    if (!ok) console.log(c.d(`        got: ${(r.answer || r.message || '').slice(0, 150)}…`));

    sr.cases.push({ q: tc.q, ok, fails, latency: r.latency,
                    sources: (r.sources || []).map(s => s.id), answer: r.answer });
    await new Promise(res => setTimeout(res, 250)); // stay under the rate limit
  }
  report.suites.push(sr);
  console.log('');
}

latencies.sort((a, b) => a - b);
const p = q => latencies[Math.floor(latencies.length * q)] || 0;

report.summary = { pass, fail, p50: p(0.5), p95: p(0.95) };

console.log(c.b('─'.repeat(52)));
console.log(`${c.g(pass + ' passed')}   ${fail ? c.r(fail + ' failed') : c.d('0 failed')}`);
console.log(c.d(`latency  p50 ${p(0.5)}ms   p95 ${p(0.95)}ms`));
console.log(c.d(`est. cost ~${(latencies.length * 21)} neurons (~${(latencies.length * 21 / 100).toFixed(1)}% of daily free tier)`));
console.log('');

if (jsonOut) { await writeFile(jsonOut, JSON.stringify(report, null, 2)); console.log(c.d(`report → ${jsonOut}\n`)); }
process.exit(fail ? 1 : 0);
