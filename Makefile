.Phony: install
install:
	PUPPETEER_PRODUCT=chrome deno run -A --unstable https://deno.land/x/puppeteer@14.1.1/install.ts

.Phony: all
all:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts
.Phony: build
build:
	DEV=1 NO_SERVE=1 deno run -A main.ts

.Phony: run
run:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --site hackernews
.Phony: runfromformat
runfromformat:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage format,translate,build_current,archive,build_site,serve_site --site hackernews
.Phony: start
start:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage translate,build_current,archive,build_site,serve_site --site hackernews

.Phony: fetch
fetch:
	DEV=1 deno run -A main.ts --stage fetch --site hackernews

.Phony: fetchall
fetchall:
	DEV=1 deno run -A main.ts --stage fetch

.Phony: format
format:
	DEV=1 deno run -A main.ts --stage format --site hackernews

.Phony: tr
tr:
	DEV=1 deno run -A main.ts --stage translate --site hackernews

.Phony: trall
trall:
	DEV=1 deno run -A main.ts --stage translate

.Phony: current
current:
	DEV=1 deno run -A main.ts --stage build_current --site hackernews

.Phony: site
site:
	DEV=1 deno run -A main.ts --stage build_site,serve_site --site hackernews
