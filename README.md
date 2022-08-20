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

## Deploy to workers

- [workers get started](https://developers.cloudflare.com/workers/get-started/guide/)

```bash
wrangler r2 bucket create feed
```

## Tools

- [QuickType](https://app.quicktype.io/) - JSON to TypeScript

## TODO

- [ ] add more feeds
- [ ] add score
- [x] tags
- [ ] check cors
- [x] support workers deploy
- [ ] change archive lang to hackernews/en/
- [ ] cache image to imgur?
