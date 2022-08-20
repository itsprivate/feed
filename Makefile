.Phony: install
install:
	PUPPETEER_PRODUCT=chrome deno run -A https://deno.land/x/puppeteer@14.1.1/install.ts

.Phony: all
all:
	DEV=1 deno run -A main.ts

.Phony: build
build:
	DEV=1 NO_SERVE=1 deno run -A main.ts

.Phony: prod-build
prod-build:
	make prod-loadcurrent && MOCK=0 MOCK_IMAGE=0 deno run -A main.ts

.Phony: build-full
build-full:
	make load && make DEV=1 NO_SERVE=1 deno run -A main.ts --stage "decompress_current,fetch,format,translate,build_current,archive,build_site,upload_archive" && make upload

.Phony: build_for_workders_dev
build_for_workders_dev:
	WORKERS_DEV=1 DEV=1 NO_SERVE=1 deno run -A  main.ts

.Phony: run
run:
	DEV=1 deno run -A main.ts --site prodshowhn 


.Phony: prod-buildfromformat
prod-buildfromformat:
	HEADLESS=0 MOCK=0 MOCK_IMAGE=0 deno run -A main.ts --stage format,translate,build_current,archive,build_site --site prodhackernews

.Phony: runfromformat
runfromformat:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage format,translate,build_current,archive,build_site,serve_site --site prodshowhn
.Phony: runfromtr
runfromtr:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage build_current,archive,build_site,serve_site --site prodhackernews

.Phony: start
start:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage build_current,archive,build_site,serve_site --site prodhackernews

.Phony: loadcurrent
loadcurrent:
	wrangler r2 object get dev-feed/dev-current.zip
	
.Phony: prod-loadcurrent
prod-loadcurrent:
	wrangler r2 object get feed/current.zip

.Phony: loadarchive
loadarchive:
	DEV=1 deno run -A scripts/load-archive.ts
	
.Phony: prod-loadarchive
prod-loadarchive:
	deno run -A scripts/load-archive.ts

.Phony: compresscurrent
compresscurrent:
	DEV=1 deno run -A main.ts --stage compress_current

.Phony: uploadcurrent
uploadcurrent:
# DEV=1 deno run -A main.ts --stage upload_current
	wrangler r2 object put dev-feed/dev-current.zip -f ./dev-current.zip

.Phony: prod-uploadcurrent
prod-uploadcurrent:
# DEV=1 deno run -A main.ts --stage upload_current
	wrangler r2 object put feed/current.zip -f ./current.zip


.Phony: uploadarchive
uploadarchive:
	DEV=1 deno run -A main.ts --stage upload_archive

.Phony: prod-uploadarchive
prod-uploadarchive:
	deno run -A main.ts --stage upload_archive

.Phony: upload
upload:
	make uploadcurrent && make uploadarchive

.Phony: prod-upload
prod-upload:
	make prod-uploadcurrent && make prod-uploadarchive


.Phony: fetch
fetch:
	DEV=1 deno run -A main.ts --stage fetch --site prodhackernews

.Phony: fetchall
fetchall:
	DEV=1 deno run -A main.ts --stage fetch

.Phony: format
format:
	DEV=1 deno run -A main.ts --stage format --site prodhackernews

.Phony: tr
tr:
	DEV=1 deno run -A main.ts --stage translate --site prodhackernews

.Phony: trtest
trtest:
	HEADLESS=0 MOCK=0 DEV=1 deno run -A main.ts --stage translate --site prodhackernews


.Phony: trall
trall:
	DEV=1 deno run -A main.ts --stage translate

.Phony: build-current
build-current:
	DEV=1 deno run -A main.ts --stage build_current --site prodhackernews

.Phony: site
site:
	DEV=1 deno run -A main.ts --stage build_site,serve_site --site prodhackernews

.Phony: deploy
deploy:
	DEV=1 deno run -A main.ts --stage deploy

.Phony: dev
dev:
	wrangler dev


.Phony: publish
publish:
	wrangler publish

.Phony: prod-publish
prod-publish:
	wrangler publish --env prod


.Phony: test
test:
	DEV=1 deno test -A

.Phony: prod-deletecurrent
prod-deletecurrent:
	deno run -A ./scripts/clean-current.ts

.Phony: prod-deletearchive
prod-deletearchive:
	deno run -A ./scripts/clean-archive.ts

.Phony: deletecurrent
deletecurrent:
	DEV=1 deno run -A ./scripts/clean-current.ts

.Phony: deletearchive
deletearchive:
	DEV=1 deno run -A ./scripts/clean-current.ts

.Phony: prod-servearchive
prod-servearchive:
	deno run -A ./dev-archive-site.ts

.Phony: servearchive
servearchive:
	DEV=1 deno run -A ./dev-archive-site.ts

.Phony: check-fmt
check-fmt:
	deno fmt --check

.Phony: fmt
fmt:
	deno fmt

.Phony: test-file
test-file:
	mkdir -p current/4-data/prodhackernews/ && touch current/4-data/prodhackernews/test.json && mkdir -p archive/prodhackernews/tags/job/ && touch archive/prodhackernews/tags/job/test.json && mkdir -p public/prodhackernews && touch public/prodhackernews/index.html 

.Phony: config
config:
	deno run -A ./build-config.ts

.Phony: clean
clean:
	rm -rf current/ archive/ public/ dev-current.zip current.zip dev-current/ dev-archive/