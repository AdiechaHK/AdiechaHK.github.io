# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Harikrushna V. Adiecha, hosted on GitHub Pages at harikrushna.dev.

**Current state:** The site displays an "Under Construction" placeholder page.

## Tech Stack

- Static HTML/CSS/JavaScript (no build tools or package manager)
- Tailwind CSS via CDN (current index.html)
- Font Awesome for icons (CDN)
- Google Analytics tracking (ID: G-VJB7WQ3GHS)

## Development

**Local server:**
```bash
python -m http.server 8000
```
Then visit http://localhost:8000

**Deployment:**
Push to `master` branch - GitHub Pages auto-deploys via CNAME (harikrushna.dev).

## Architecture

### Key Files
- `index.html` - Current live page (Under Construction placeholder using Tailwind)
- `new-index.html` - Work-in-progress portfolio using Vue 2.x + Tailwind (incomplete)
- `old-index.html` - Previous version of the site
- `resume.html` - Separate resume page
- `config.json` - Theme and meta settings (active/passive title, favicon paths)
- `profile.json` - Extended profile data (JSON format, not currently used)

### Prepared GitHub-themed Design (not yet live)
- `styles/github-profile.css` - Full stylesheet with dark/light mode support via CSS custom properties
- `scripts/landing.js` - JS for copyright year and contribution graph generation
- Uses `data-theme="dark"` attribute on html element for theming
- Two-column layout: 296px fixed sidebar + flexible main content
- Mobile breakpoint at 768px
