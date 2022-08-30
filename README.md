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
make createsite site=site_name
```

## Deploy to workers

- [workers get started](https://developers.cloudflare.com/workers/get-started/guide/)

```bash
wrangler r2 bucket create feed
```

## Tools

- [QuickType](https://app.quicktype.io/) - JSON to TypeScript
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

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

## Migration

```bash
PROD=1 deno run -A ./migrations/move-reddit.ts


NO_TRANSLATE=1 make prod-buildfromformat


# if need, also move issues
PROD=1 deno run -A ./migrations/move-reddit-issues.ts

# upload archive
make prod-awsuploadarchive
# aws configure set s3.max_concurrent_requests 50
# 50 is fine, seems 100 is too much

# maybe also need to dufs storage

make prod-zipuploadarchive


# upload current
make prod-uploadcurrent
# create site
make createsite site=ask
# build site, and publish
make prod-publish
```

## Create New Site

```bash
make createsite site=site_name
# add config
# add custom name
```

## TODO

- [ ] add more feeds
- [x] add score
- [x] tags
- [ ] check cors
- [x] support workers deploy
- [x] change archive lang to hackernews/en/
- [x] cache image to imgur?
- [x] add latest build
- [x] add lite version
- [x] show issues
- [x] show tags
- [x] show archives
- [x] fetch 的时候先 check 本地的数据
- [ ] sitemap support
- [ ] support search
- [x] archive backup
- [x] current backup
- [x] add links meta
- [x] relative links for most links
- [ ] issue generate support
- [x] twitter message support
- [x] config import
- [ ] build www.buzzing.cc index for all sites
