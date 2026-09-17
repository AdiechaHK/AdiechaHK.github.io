# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Harikrushna V. Adiecha, hosted on GitHub Pages at harikrushna.dev.

**Positioning:** The site presents Harikrushna as an engineer who deploys AI systems into production,
backed by 13+ years of backend architecture and live-system ownership. Content is evidence-led — every
number on the page is one he can defend in an interview. Do not add claims that cannot be substantiated,
and do not generate fake activity data.

## Tech Stack

- Static HTML/CSS/JavaScript (no build tools or package manager)
- Single-file architecture: `index.html` contains all CSS and JS inline
- Font Awesome 6.5.1 and Inter via CDN
- Google Analytics (ID: G-VJB7WQ3GHS)

## Development

**Local server:**
```bash
python -m http.server 8000
```
Then visit http://localhost:8000

**Deployment:**
Push to `master` — GitHub Pages auto-deploys via CNAME (harikrushna.dev).

## Architecture

### Key Files
- `index.html` — the live site. Self-contained: inline `<style>`, inline `<script>`, GitHub-profile-inspired layout
- `resume.html` — separate resume page
- `time-calculator.html`, `loc/` — standalone utilities
- `old-index.html`, `new-index.html` — superseded versions, not linked
- `config.json` — active/passive title and favicon settings
- `profile.json` — extended profile data (not currently consumed by index.html)
- `styles/`, `scripts/` — assets for an earlier split-file approach; `index.html` does not use them

### index.html structure
- Two-column layout: 296px sidebar (avatar, bio, contact, socials) + main content
- Main content sections: About → Selected Work → Technical Skills → Experience → Tech Talks → Beyond Code
- **Selected Work** is the centerpiece: each `.work-card` is one shipped system with context, what made
  it hard, and a measurable result in `.work-result`
- Theming via `data-theme` on `<html>`, toggled by `toggleTheme()`; all colors come from CSS custom
  properties defined on `:root` and `[data-theme="light"]`. Never hard-code a color
- Mobile breakpoint at 768px; `.pinned-grid` and `.work-list` also reflow at 900px

### Notable behaviors
- Typing effect in `.profile-username` cycles `phrases[]`
- The pixel grid in `.contrib-section` is a **decorative display, not contribution data** — it spells
  words from `desktopWords` / `mobileWords` using a 5x7 bitmap font. Available glyphs are limited
  (L A R V E T I S N P H C O D K); check the `font` object before adding a word
- Favicon and title swap on window blur/focus
