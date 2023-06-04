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

## Config Usage

### 站点配置

```yaml
hnnew:
  port: 8018 # 本地测试端口
  redirect: true # 可选，是否需要跳转，主要用于旧的buzzing网站的一些302跳转，新站点不需要设置，或者设置为false
  priority: 24 # 可选，优先级，决定着该网站在buzzing首页的排名，越小，排名越靠前，可以不设置
  archive: true # 是否需要保存所有历史记录，如果有的网站更新特别频繁，并且没有保存的需要，可以设置为false
  category: Tech # 该网站的类型， 目前没有特别的作用，只是为了给开发人员记录的
  hide: true # 是否默认在首页隐藏，隐藏后只能从首页的头部导航去访问。
  related: # 相关网站，如果有配置的话，则会在buzzing 首页，该网站的标题附近插入这些相关站点，具体可以参考 buzzing.cc hn热门区域
    - hn
    - hnfront
    - showhn
    - askhn
  tags: # 标签，1. 用于分类，同一个tag的网站会在该站点的头部导航显式地展示同类网站，其他网站则会默认折叠；2. source 开头的tag则用于程序去寻找该站点的source，比如RSS，Twitter
    - hn
    - source-hackernews-new
  translations: # 翻译，short_title 是为了当用户保存该站点为桌面app时的默认名称
    "zh-Hans":
      title: "Hacker News 最新提交"
      short_title: "HN最新"
      description: "用中文浏览Hacker News 最新提交, Points >= 2 "
      keywords: "HackerNews 头条, Hacker News 中文, Hacker News Story"
    "en":
      title: "Hacker News Newest"
      short_title: "HN Newest"
      description: "Hacker News Newest"
      keywords: "HackerNews 头条, Hacker News 中文, Hacker News Story"
    "ja":
      title: "Hacker News の最新の投稿"
      short_title: "HN最新"
      description: "人気の Hacker News の最新 の投稿"
      keywords: "HackerNews 头条, Hacker News 中文, Hacker News Story"
    "zh-Hant":
      title: "Hacker News 最新提交"
      short_title: "HN最新"
      description: "用中文浏览Hacker News 最新提交"
      keywords: "HackerNews 头条, Hacker News 中文, Hacker News Story"
```

### 源配置

```yaml
- id: source-google-china # id，对应上面的tags下的id
  type: rss # 类型，在adapters 里的适配器类型
  api: # api配置，比如如下的rss类型，配置 url，name， home_page_url 即可
    url: https://feeds.bbci.co.uk/news/world/rss.xml
    name: BBC World News
    home_page_url: https://www.bbc.com/news/world
  rules: # 如果想过滤一些内容，那么可以在这里配置过滤规则
    - type: limit
      value: "20"
    - type: notEndsWith
      key: getHostname
      value: ".cn"
    - type: notInclude
      key: getTags
      value: "U.S. News & World Report"
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
