#!/usr/bin/env node
/**
 * Precompute embeddings for the corpus so the Worker never embeds documents at
 * request time — only the incoming question. That keeps per-question cost at
 * roughly one embedding call plus one generation call.
 *
 * Usage:
 *   CF_ACCOUNT_ID=... CF_API_TOKEN=... node scripts/build-index.mjs
 *
 * Writes worker/index.json, which src/index.js imports.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const CORPUS = resolve(__dir, '../../content/corpus.json');
const OUT    = resolve(__dir, '../index.json');

const MODEL = '@cf/baai/bge-base-en-v1.5';
const { CF_ACCOUNT_ID, CF_API_TOKEN } = process.env;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error('Set CF_ACCOUNT_ID and CF_API_TOKEN.');
  console.error('Token needs the "Workers AI: Read" permission.');
  process.exit(1);
}

async function embed(texts) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${MODEL}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${CF_API_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ text: texts }),
  });
  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status} ${await res.text()}`);
  }
  const body = await res.json();
  if (!body.success) throw new Error(JSON.stringify(body.errors));
  return body.result.data;
}

const corpus = JSON.parse(await readFile(CORPUS, 'utf8'));

// Embed title + tags + text together. Tags matter: they carry the everyday
// phrasing a visitor uses ("hardest problem") that the prose itself may not.
const inputs = corpus.chunks.map(c =>
  `${c.title}. ${(c.tags || []).join(', ')}. ${c.text}`
);

console.log(`Embedding ${inputs.length} chunks with ${MODEL}…`);
const vectors = await embed(inputs);

const index = {
  built: new Date().toISOString(),
  model: MODEL,
  dims: vectors[0]?.length ?? 0,
  chunks: corpus.chunks.map((c, i) => ({
    id: c.id,
    title: c.title,
    text: c.text,
    vector: vectors[i].map(v => Math.round(v * 1e5) / 1e5), // trim float noise
  })),
};

await writeFile(OUT, JSON.stringify(index));
const kb = (JSON.stringify(index).length / 1024).toFixed(0);
console.log(`Wrote ${OUT} — ${index.chunks.length} chunks, ${index.dims} dims, ${kb} KB`);
