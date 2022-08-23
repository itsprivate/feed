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

## AWS Cli Notes

```bash
# copy file
aws s3 cp s3://mybucket/items.json items.json --endpoint-url https://example.com

# download folder
aws s3 cp s3://mybucket/items/test localtest --endpoint-url https://example.com --recursive

# sync the whole folder
aws s3 sync s3://mybucket . --endpoint-url https://example.com
```

## TODO

- [ ] add more feeds
- [ ] add score
- [x] tags
- [ ] check cors
- [x] support workers deploy
- [ ] change archive lang to hackernews/en/
- [ ] cache image to imgur?
- [ ] add latest build
- [ ] add lite version
- [ ] show issues
- [ ] show tags
- [ ] show archives
- [ ] fetch 的时候先 check 本地的数据
