.Phony: install
install:
	PUPPETEER_PRODUCT=chrome deno run -A https://deno.land/x/puppeteer@14.1.1/install.ts

.Phony: all
all:
	DEV=1 deno run -A main.ts
.Phony: build
build:
	DEV=1 NO_SERVE=1 deno run -A main.ts

.Phony: build-full
build-full:
	DEV=1 NO_SERVE=1 deno run -A main.ts --stage "load_current,fetch,format,translate,build_current,archive,build_site,upload_current,upload_archive"

.Phony: build_for_workders_dev
build_for_workders_dev:
	WORKERS_DEV=1 DEV=1 NO_SERVE=1 deno run -A  main.ts
.Phony: run
run:
	DEV=1 deno run -A main.ts --site prodshowhn 
buildprod:
	MOCK=0 MOCK_IMAGE=0 deno run -A main.ts
.Phony: buildprodfromformat
buildprodfromformat:
	HEADLESS=0 MOCK=0 MOCK_IMAGE=0 deno run -A main.ts --stage format,translate,build_current,archive,build_site,upload_current,upload_archive --site prodhackernews

.Phony: runfromformat
runfromformat:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage format,translate,build_current,archive,build_site,serve_site --site prodshowhn
.Phony: runfromtr
runfromtr:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage build_current,archive,build_site,serve_site --site prodhackernews
runtoarchive:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage format,translate,build_current,archive,build_site,serve_site --site prodhackernews
.Phony: start
start:
	DEV=1 deno run -A --watch=main.ts,templates/,config.yml,static/ main.ts --stage build_current,archive,build_site,serve_site --site prodhackernews

.Phony: load
load:
	DEV=1 deno run -A main.ts --stage load_current
	
.Phony: loadprod
loadprod:
	deno run -A main.ts --stage load_current

.Phony: loadarchive
loadarchive:
	DEV=1 deno run -A scripts/load-archive.ts
	
.Phony: loadarchiveprod
loadarchiveprod:
	deno run -A scripts/load-archive.ts

.Phony: upload
upload:
	DEV=1 deno run -A main.ts --stage upload_current

.Phony: upload-archive
upload-archive:
	DEV=1 deno run -A main.ts --stage upload_archive

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

.Phony: publishprod
publishprod:
	wrangler publish --env prod


.Phony: test
test:
	DEV=1 deno test -A

.Phony: deletedataprod
deletedataprod:
	deno run -A ./scripts/clean-current.ts
.Phony: deletearchiveprod
deletearchiveprod:
	deno run -A ./scripts/clean-archive.ts

.Phony: deletedata
deletedata:
	DEV=1 deno run -A ./scripts/clean-current.ts
.Phony: deletearchive
deletearchive:
	DEV=1 deno run -A ./scripts/clean-current.ts

.Phony: archivesiteprod
archivesiteprod:
	deno run -A ./dev-archive-site.ts
.Phony: archivesite
archivesite:
	DEV=1 deno run -A ./dev-archive-site.ts
.Phony: check-fmt
check-fmt:
	deno fmt --check

.Phony: fmt
fmt:
	deno fmt

.Phony: uploadprod
uploadprod:
	deno run -A main.ts --stage "upload_current,upload_archive"

.Phony: test-file
test-file:
	mkdir -p current/4-data/prodhackernews/ && touch current/4-data/prodhackernews/test.json && mkdir -p archive/prodhackernews/tags/job/ && touch archive/prodhackernews/tags/job/test.json && mkdir -p public/prodhackernews && touch public/prodhackernews/index.html 

.Phony: config
config:
	deno run -A ./build-config.ts