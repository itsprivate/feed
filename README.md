# feed

## Development

### run

```bash
make run
```

### skip fetch

```bash
make start
```

### translate

```bash
make tr
```

## New Site

```bash
make createsite name=site_name
```

## Deploy to workers

- [workers get started](https://developers.cloudflare.com/workers/get-started/guide/)

```bash
wrangler r2 bucket create feed
```

## Tools

- [QuickType](https://app.quicktype.io/) - JSON to TypeScript

## Init

```bash
# init current.zip folder in s3
make prod-initcurrentzip
make prod-build
```

See `.github/workflows/cron.yml`

## TODO

- [ ] add more feeds
- [ ] add score
- [x] tags
- [ ] check cors
- [x] support workers deploy
- [ ] change archive lang to hackernews/en/
- [ ] cache image to imgur?
