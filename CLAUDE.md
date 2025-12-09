# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Deno-based RSS feed aggregator and static site generator that:
- Fetches content from multiple sources (HN, Reddit, Twitter, RSS feeds, etc.)
- Translates content to multiple languages (zh-Hans, zh-Hant, en, ja)
- Generates static sites deployed to Cloudflare Pages
- Archives historical content to S3-compatible storage

## Common Commands

```bash
# Development - run full pipeline with watch mode (single site)
make run

# Development - run specific site
make runsite site=devfeed

# Run tests
make test           # or: deno test -A

# Format code
make fmt            # or: deno fmt
make checkfmt       # check formatting: deno fmt --check

# Individual stages
make fetch          # fetch from sources
make format         # format fetched items
make tr             # translate items
make build          # build static sites
make serve          # build and serve locally

# Production variants (prefix with prod-)
make prod-source    # fetch+format+translate+build_current
make prod-build     # build all sites
make prod-serve     # build and serve

# Run specific stage on specific site
make stage stage=translate site=devfeed

# Cache management
make loadcurrent    # download cache from S3
make uploadcurrent  # upload cache to S3
```

## Architecture

### Pipeline Stages (workflows/)
The main processing pipeline runs in numbered stages:
1. `1-fetch-sources.ts` - Fetch raw content from configured sources
2. `2-format-items.ts` - Normalize items to standard format (FormatedItem)
3. `3-translate-items.ts` - Translate content using headless browser translation
4. `4-build-current.ts` - Build current content cache
5. `5-archive.ts` - Archive items for historical access
6. `6-build-site.ts` - Generate static HTML sites
7. `7_0-build-index-site.ts` - Build the index site (www)
8. `7-serve-site.ts` - Local development server

### Adapters (adapters/)
Source-specific adapters handle fetching and parsing:
- `hn.ts` - Hacker News
- `reddit.ts` - Reddit
- `twitter.ts`, `twitterv2.ts` - Twitter/X
- `rss.ts` - Generic RSS feeds
- `googlenews.ts` - Google News
- `ph.ts` - Product Hunt
- And others for specific sites

### Key Files
- `config.yml` - Site and source configuration
- `config.gen.json` - Generated config (from config.yml via `make config`)
- `main.ts` - Entry point, orchestrates stages
- `interface.ts` - TypeScript interfaces for all data types
- `item.ts` - Item class with formatting and translation logic
- `util.ts` - Shared utilities
- `deps.ts` - Centralized dependency imports

### Directory Structure
- `current/` / `prod-current/` - Current content cache
- `archive/` / `prod-archive/` - Historical archives
- `cache/` / `prod-cache/` - Translation and fetch cache
- `public/` / `prod-public/` - Generated static sites
- `templates/` - Mustache templates for HTML generation

## Environment Variables

- `PROD=1` - Use production paths (prod-current, prod-archive, etc.)
- `DEBUG=1` - Enable debug logging
- `MOCK=0` - Disable translation mocking
- `HEADLESS=1` - Run browser in headless mode
- `NO_SERVE=1` - Skip serving after build
- `NO_TRANSLATE=1` - Skip translation stage
- `SITE=sitename` - Target specific site

## Configuration

Sites and sources are defined in `config.yml`:
- Sites define ports, tags, translations, and display options
- Sources define adapters, APIs, and filtering rules
- Tags link sources to sites (e.g., `source-hackernews-new` tag)

## Data Flow

Raw Source -> FormatedItem -> FeedItem (with translations) -> Feedjson -> Static HTML
