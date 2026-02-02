# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Harikrushna V. Adiecha (Tech Lead - AI), hosted on GitHub Pages at harikrushna.dev.

## Tech Stack

- Static HTML/CSS/JavaScript (no build tools or package manager)
- Font Awesome 6.5.1 for icons (CDN)
- Google Analytics tracking enabled

## Development

**Local server:**
```bash
python -m http.server 8000
```
Then visit http://localhost:8000

**Deployment:**
Push to `master` branch - GitHub Pages auto-deploys.

## Architecture

### File Structure
- `index.html` - Main page with all content (profile, skills, community, experience)
- `styles/github-profile.css` - Primary stylesheet (GitHub-themed with dark/light mode support)
- `scripts/landing.js` - Minimal JS for dynamic copyright year and contribution graph
- `config.json` - Theme and experience display settings
- `profile.json` - Extended profile data (not currently used in main page)
- `CNAME` - Custom domain configuration

### Styling
- CSS custom properties for theming (`data-theme="dark"` on html element)
- Two-column layout: 296px fixed sidebar + flexible main content
- Mobile breakpoint at 768px
- Skill chips use `.expert` class for highlighting primary skills

### Content Sections
The page is organized into tabbed sections (About, Skills, Community, Experience) with scroll-based navigation using anchor links.
