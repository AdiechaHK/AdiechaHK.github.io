# ask-hk

A grounded question-answering assistant over a fixed corpus of facts about me, running on
Cloudflare Workers AI. It powers the chat interface on [harikrushna.dev](https://harikrushna.dev).

The interesting part is not that it answers questions. It is what it refuses to do, and what it
costs.

---

## The problem

I wanted visitors to be able to ask my site questions instead of scrolling it. The obvious
implementation — pipe the question to an LLM with a bio in the system prompt — has a failure mode
I was not willing to ship: **a model confidently inventing facts about a real person on that
person's job-search site.** A hallucinated employer, an inflated number, a fabricated
qualification. I would not find out; a recruiter would.

So the design goal was never "answer as much as possible". It was **answer only what I can
defend, and refuse clearly otherwise** — while staying inside a cost envelope that cannot produce
a surprise bill.

---

## Architecture

```
question
   │
   ├─ slash command? ──────────────► local canned answer, 0ms, no API call
   │
   ▼
embed question (bge-base-en-v1.5)
   │
   ▼
cosine similarity over 17 precomputed chunk vectors
   │
   ├─ best score < 0.34 ──────────► refuse before generating (cheaper, and
   │                                 structurally cannot hallucinate)
   ▼
top-3 chunks as CONTEXT
   │
   ▼
llama-3.1-8b-instruct-fp8, temperature 0.2, max 320 tokens
   │
   ▼
answer + source attribution
```

Chunk embeddings are precomputed at build time (`scripts/build-index.mjs`) and bundled with the
Worker, so a request embeds only the incoming question — one small embedding call plus one
generation call.

### Layout

| Path | What it is |
|---|---|
| `content/corpus.json` | The single source of truth. 17 chunks, every claim defensible. |
| `worker/src/index.js` | Retrieval, grounding, rate limiting, refusals. |
| `worker/scripts/build-index.mjs` | Precomputes chunk embeddings → `worker/index.json`. |
| `evals/cases.json` | 36 behavioural cases across 6 suites. |
| `evals/run.mjs` | Runner. Non-zero exit on failure, so it can gate a deploy. |

---

## Decisions worth explaining

### Why RAG and not fine-tuning

The corpus is ~4,000 words and changes whenever I ship something. Fine-tuning would cost more,
take longer, need redoing on every edit, and — critically — would bake the facts into weights
where I could not *point at* the source of an answer. Retrieval keeps the facts in a JSON file I
can diff in a pull request, and lets the response cite which chunk it came from.

### Why the slash commands never touch the model

`/experience` has exactly one correct answer and I already wrote it. Sending it to an LLM would
add 500ms of latency, spend neurons, and introduce a small chance of the model paraphrasing a
number wrong. **The model earns its place only where the question is open-ended.**

This is also the honest engineering answer to "should we use AI here?" — mostly no, and being
deliberate about the boundary is the point. Most visitors never trigger a model call at all.

### Why it refuses before generating

If the best cosine similarity is below 0.34, nothing in the corpus covers the question, so the
Worker returns a fixed refusal without calling the chat model. Three benefits, in order of
importance:

1. It **cannot** hallucinate, because no generation happens.
2. It is faster — no generation round-trip.
3. It costs ~0.2 neurons instead of ~21.

The threshold was tuned against the `refusal` eval suite: high enough that "what's his salary
expectation" refuses, low enough that "has he worked with customers directly" still retrieves.

### Prompt injection

Visitor input is untrusted. The system prompt instructs the model to treat everything after the
`QUESTION:` marker strictly as a question, never as an instruction, and the context is presented
before it. The `prompt-injection` eval suite covers six attacks — role override, system-prompt
extraction, forced false statements, appended instructions, and impersonation — asserting on
what must *not* appear in the output.

This is defence in depth rather than a guarantee. A determined attacker may still get something
odd out of an 8B model. The mitigations that actually bound the damage are structural: the model
has no tools, no write access, and nothing in its context except facts I published anyway.

The client also escapes model output before inserting it into the DOM. The model is not a trusted
source of markup.

### Honest limits, deliberately in the corpus

The corpus contains a chunk called `depth-honesty` stating that I have used Kubernetes but not
owned it, that I integrated a computer-vision detection API rather than training it, and that I am
not an ML researcher. Four evals assert the assistant reproduces those limits rather than
smoothing them away.

An assistant that oversells me is worse than no assistant, because the overselling surfaces in an
interview where I then have to walk it back.

---

## Cost

Per question, with Workers AI's published neuron rates:

| Step | Tokens | Neurons |
|---|---:|---:|
| Embed question — bge-base @ 6,058/M | ~30 | 0.2 |
| Input: system prompt + 3 chunks + question @ 13,778/M | ~1,200 | 16.5 |
| Output @ 26,128/M | ~180 | 4.7 |
| **Total** | | **≈ 21** |

The free allocation is **10,000 neurons/day**, so roughly **465 questions per day at no cost** —
recurring daily, not a trial credit.

**On the Free Workers plan this is a hard ceiling.** There is no card on file; requests past the
allocation fail rather than bill. A surprise invoice is not merely unlikely, it is structurally
impossible without deliberately upgrading. If upgraded, overflow runs at $0.011/1,000 neurons —
about **$0.00024 per question**.

A full eval run is 36 questions ≈ 760 neurons, about 7.6% of a day's allocation. Cheap enough to
run on every corpus change, too expensive to run on every commit.

### What bounds it

- `MAX_OUTPUT_TOKENS = 320` caps the expensive half of each call.
- Per-IP rate limit: 12 questions per 5 minutes, in KV.
- `ALLOWED_ORIGINS` restricts the endpoint to my own site.
- Refusals short-circuit before generation.

Worst realistic case — someone scripts it for amusement — is that the assistant goes quiet until
00:00 UTC and the page falls back to its local answers. No bill, no outage.

---

## Failure modes

Every one of these degrades to the built-in keyword answers rather than showing an error.

| Failure | Behaviour |
|---|---|
| Daily allocation exhausted | Worker returns 503 `fallback:true`; client uses local answers. |
| Worker down / network error | 12s client timeout, then local answers. |
| Rate limited | 429 with a plain-English message; no fallback needed. |
| Retrieval below threshold | Fixed refusal plus a hand-off to email. |
| Endpoint not configured at all | `ENDPOINT = null` — the page is fully static and works exactly as before. |

The client flips `liveOK = false` after the first hard failure, so a dead endpoint costs one
timeout per session rather than one per question.

---

## Evals

36 cases, 6 suites. Not writing-quality scoring — behaviour scoring, because the regressions that
matter here are factual.

| Suite | Cases | Asserts |
|---|---:|---|
| `retrieval-accuracy` | 10 | The right chunk wins. If retrieval is wrong, grounding is irrelevant. |
| `numeric-fidelity` | 6 | Figures match the corpus verbatim. "10 seconds" must not become "zero downtime". |
| `refusal` | 8 | Out-of-corpus questions hand off instead of improvising. |
| `honesty-about-limits` | 4 | Stated weaknesses survive into the answer. |
| `prompt-injection` | 6 | Adversarial input is treated as data. |
| `tone` | 2 | No "Based on the context", no "As an AI". |

```bash
ENDPOINT=https://ask-hk.<subdomain>.workers.dev node evals/run.mjs
ENDPOINT=... node evals/run.mjs --suite prompt-injection
ENDPOINT=... node evals/run.mjs --json report.json
```

The runner reports p50/p95 latency and estimated neuron spend, and exits non-zero on any failure.

---

## Deploying

```bash
cd worker
npm install -g wrangler
wrangler login

# 1. Precompute chunk embeddings (needs a token with Workers AI: Read)
CF_ACCOUNT_ID=xxx CF_API_TOKEN=yyy node scripts/build-index.mjs

# 2. Optional but recommended — per-IP rate limiting
wrangler kv namespace create RL
#    paste the returned id into wrangler.toml and uncomment the block

# 3. Ship
wrangler deploy
```

Then set `ENDPOINT` in `designs/chat.html` to the deployed URL. Until you do, the page stays fully
static — which is the intended default, not a degraded one.

Re-run `build-index.mjs` whenever `content/corpus.json` changes, then re-run the evals.

---

## What I would do differently at scale

This is sized for a personal site — a handful of questions a day over 17 chunks. Linear cosine
scan over an in-memory array is the right call at that size and the wrong call at 10,000 chunks,
where it becomes Vectorize or a real vector store. Chunking is manual and semantic because 17
hand-written chunks beat 200 automatically split ones; that inverts somewhere around a few
hundred documents.

I would also want an offline eval on retrieval alone — precision@k against labelled
question/chunk pairs, no generation — so retrieval regressions can be caught for ~0.2 neurons
instead of 21.
