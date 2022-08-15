.Phony: install
install:
	PUPPETEER_PRODUCT=chrome deno run -A --unstable https://deno.land/x/puppeteer@14.1.1/install.ts


.Phony: run
run:
	DEV=1 MOCK=1 deno run -A main.ts --site hackernews.buzzing.cc

.Phony: start
start:
	DEV=1 MOCK=1 deno run -A main.ts --stage translate,build_items,archive,build_site,serve_site --site hackernews.buzzing.cc

.Phony: fetch
fetch:
	DEV=1 deno run -A main.ts --stage fetch --site hackernews.buzzing.cc

.Phony: format
format:
	DEV=1 deno run -A main.ts --stage format --site hackernews.buzzing.cc

.Phony: tr
tr:
	DEV=1 deno run -A main.ts --stage translate --site hackernews.buzzing.cc

.Phony: current
current:
	DEV=1 deno run -A main.ts --stage build_current --site hackernews.buzzing.cc

.Phony: site
site:
	DEV=1 deno run -A main.ts --stage build_site,serve_site --site hackernews.buzzing.cc
