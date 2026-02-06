# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deno-based RSS feed aggregator and static site generator powering **buzzing.cc**. Fetches content from ~50 sources (HN, Reddit, Twitter, RSS, Google News, Product Hunt, etc.), translates to 4 languages (zh-Hans, zh-Hant, en, ja), and generates static sites deployed to Cloudflare Pages. Archives historical content to S3-compatible storage.

## Common Commands

```bash
# Development - run full pipeline (devfeed site, with watch mode)
make run

# Run specific site
make runsite site=devfeed

# Run a specific stage on a specific site
make stage stage=translate site=devfeed

# Individual stages
make fetch          # fetch from sources
make format         # format fetched items
make tr             # translate items
make build          # build static sites
make serve          # build and serve locally

# Testing
make test                            # run all tests: deno test -A
deno test -A ./adapters/hn_test.ts   # run a single test file
deno test -A --filter "test name"    # run tests matching a name

# Formatting
make fmt            # deno fmt
make checkfmt       # deno fmt --check

# Config regeneration (after editing config.yml)
make config

# Production variants (prefix with prod-)
make prod-source    # fetch+format+translate+build_current
make prod-build     # build all sites
make prod-serve     # build and serve

# Cache management
make loadcurrent    # download cache from S3
make uploadcurrent  # upload cache to S3

# Deploy a site to Cloudflare Pages
make publish site=sitename
make prod-publishall   # publish all sites
```

## Architecture

### Pipeline (main.ts → workflows/)

`main.ts` is the single entry point. It regenerates config, then runs numbered stages sequentially:

1. **fetch** (`1-fetch-sources.ts`) — Fetches raw content from APIs, writes JSON to `cache/1-raw/`
2. **format** (`2-format-items.ts`) — Instantiates adapter classes, calls `getFormatedItem()`, writes to `cache/2-formated/`
3. **translate** (`3-translate-items.ts`) — Translates titles via DeepL Pro API (`dp.ts`), writes to `cache/3-translated/`. zh-Hant is auto-generated from zh-Hans in `build-config.ts`
4. **build_current** (`4-build-current.ts`) — Merges translated items into `current/items/{site}/items.json`
5. **archive** (`5-archive.ts`) — Archives items by week (currently disabled)
6. **build_site** (`6-build-site.ts`) — Generates `feed.json`, `feed.xml`, `index.html` per (language × version) combination
7. **build_index_site** (`7_0-build-index-site.ts`) — Builds the buzzing.cc homepage (www site)
8. **serve_site** (`7-serve-site.ts`) — Local dev server

CLI shortcuts: `--source` = stages 1-4, `--build` = stages 6-7, `--serve` = stages 6-8.

### Adapter Pattern (adapters/)

Each source type has an adapter class extending `Item<T>` (defined in `item.ts`), where `T` is the raw API response type. Adapters override getter methods: `getId()`, `getTitle()`, `getUrl()`, `getOriginalPublishedDate()`, `getScore()`, `getNumComments()`, `getImage()`, `getTags()`, etc. The base class's `getFormatedItem()` orchestrates building the normalized `FormatedItem`.

Adapters are registered by type name in `adapters/mod.ts`. The `type` field in a source's config.yml entry must match a key in this registry.

### Source-to-Site Mapping

Sites and sources are linked via tags in `config.yml`. Each site has a `tags` array containing `source-*` entries that match source `id` fields. Example: site `hn` has tag `source-hackernews-new`, which matches the source with `id: source-hackernews-new`.

### Key Data Types (interface.ts)

- **`FormatedItem`** — Normalized item from any source (id, url, date, tags, translations, score, etc.)
- **`FeedItem extends FormatedItem`** — Adds title, summary, content_html, author for display
- **`Feedjson`** — JSON Feed format with items array and site metadata
- **`ItemsJson`** — On-disk cache format: `{ meta, items: Record<string, FormatedItem>, tags }`
- **`Config`** / **`SiteConfig`** / **`Source`** — Configuration types

Item identifiers follow the pattern: `{lang}_{type}_{year}_{month}_{day}__{id}`

### Site Generation

For each site, `6-build-site.ts` generates output for every (language, version) combination:
- Languages: zh-Hans (default, no prefix), zh-Hant, en, ja
- Versions: default, lite

Output goes to `public/{site}/` with paths like `en/lite/feed.json`. Templates are Mustache files in `templates/`.

### Key Files

- `config.yml` — Master config (~2400 lines): all sites, sources, translations, languages, versions
- `config.gen.json` — Generated from config.yml via `make config` / `build-config.ts`
- `item.ts` — Base `Item<T>` class (~700 lines), core adapter abstraction
- `interface.ts` — All TypeScript interfaces
- `util.ts` — Shared utilities (file paths, HTTP, slugs, dates, S3)
- `deps.ts` — Centralized dependency imports
- `dp.ts` — Active translation backend (DeepL Pro via Immersive Translate API)
- `filter-by-rules.ts` — Rule engine: limit, deduplicate, topRatio, notEqual, notInclude, notEndsWith
- `items-to-feed.ts` — Converts `ItemsJson` to `Feedjson`
- `feed-to-html.ts` — Renders `Feedjson` to HTML via Mustache
- `constant.ts` — `ROOT_DOMAIN` ("buzzing.cc"), item limits

### Runtime Data Directories (gitignored)

- `cache/1-raw/`, `cache/2-formated/`, `cache/3-translated/` — Pipeline stage outputs
- `current/items/{site}/` — Current merged items per site
- `public/{site}/` — Generated static site output
- `archive/` — Historical archives
- Prefix with `prod-` when `PROD=1`

## Environment Variables

- `PROD=1` — Use production paths (prod-current, prod-cache, etc.)
- `DEBUG=1` — Enable debug logging
- `MOCK=0` — Disable translation mocking (dev mode mocks by default)
- `NO_TRANSLATE=1` — Skip translation stage
- `NO_SERVE=1` — Skip serving after build
- `SITE=sitename` — Target specific site
- `FILES=N` — Override dev mode item count limit
- `REDLIB_URL` — Self-hosted Redlib instance URL for Reddit data (e.g. `https://redlib.example.com`)
- `REDDIT_CLIENT_ID` — Reddit OAuth app client ID (optional, register at https://www.reddit.com/prefs/apps)
- `REDDIT_CLIENT_SECRET` — Reddit OAuth app client secret (optional)

## Configuration (config.yml)

Sites are `standalone` (www, i, picks — excluded from normal pipeline) or regular. Regular sites need:
- `port` — Local dev server port
- `tags` — Navigation grouping + `source-*` tags linking to sources
- `translations` — Per-language title, short_title, description, keywords

Sources need:
- `id` — Must match a site's `source-*` tag
- `type` — Adapter type (must exist in `adapters/mod.ts`)
- `api` — URL, name, home_page_url
- `rules` — Optional filtering rules (limit, notInclude, deduplicate, etc.)

After editing config.yml, run `make config` to regenerate `config.gen.json`.

## Deployment

Sites deploy to `{site}.buzzing.cc` via Cloudflare Pages using wrangler. CI runs via `.github/workflows/cron.yml`: fetch → format → translate → build → upload cache to S3 → publish all sites. The archive site runs as a Docker container (`serve-archive-site.ts`) serving content from S3.

## Tool Versions

`mise.toml` pins Deno (latest) and AWS CLI versions.
