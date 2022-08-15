.Phony: install
install:
	PUPPETEER_PRODUCT=chrome deno run -A --unstable https://deno.land/x/puppeteer@14.1.1/install.ts


.Phony: run
run:
	DEV=1 MOCK=1 deno run -A main.ts --site hackernews.buzzing.cc

.Phony: runfromformatedhn
runfromtrhn:
	DEV=1 MOCK=1 deno run -A main.ts --stage translate,build_items,archive,build_site,serve_site --site hackernews.buzzing.cc

.Phony: fetchhn
fetchhn:
	DEV=1 deno run -A main.ts --stage fetch --site hackernews.buzzing.cc

.Phony: formathn
formathn:
	DEV=1 deno run -A main.ts --stage format --site hackernews.buzzing.cc

.Phony: trhn
trhn:
	DEV=1 deno run -A main.ts --stage translate --site hackernews.buzzing.cc

.Phony: itemshn
itemshn:
	DEV=1 deno run -A main.ts --stage build_items --site hackernews.buzzing.cc

.Phony: sitehn
servehn:
	DEV=1 deno run -A main.ts --stage serve_site --site hackernews.buzzing.cc