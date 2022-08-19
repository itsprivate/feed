.Phony: install
install:
	PUPPETEER_PRODUCT=chrome deno run -A --unstable https://deno.land/x/puppeteer@14.1.1/install.ts

.Phony: all
all:
	DEV=1 deno run -A --unstable main.ts
.Phony: build
build:
	DEV=1 NO_SERVE=1 deno run -A --unstable main.ts

.Phony: build-full
build-full:
	DEV=1 NO_SERVE=1 deno run -A --unstable main.ts --stage "load_current,fetch,format,translate,build_current,archive,build_site,upload_current,upload_archive"

.Phony: build_for_workders_dev
build_for_workders_dev:
	WORKERS_DEV=1 DEV=1 NO_SERVE=1 deno run -A --unstable  main.ts
.Phony: run
run:
	DEV=1 deno run -A --unstable main.ts --site prodhackernews 
buildprod:
	MOCK=0 MOCK_IMAGE=0 deno run -A --unstable main.ts --site prodhackernews
.Phony: buildprodfromformat
buildprodfromformat:
	HEADLESS=0 MOCK=0 MOCK_IMAGE=0 deno run -A --unstable main.ts --stage format,translate,build_current,archive,build_site,upload_current,upload_archive --site prodhackernews

.Phony: runfromformat
runfromformat:
	DEV=1 deno run -A --unstable --watch=main.ts,templates/,config.yml,static/ main.ts --stage format,translate,build_current,archive,build_site,serve_site --site prodhackernews
.Phony: runfromtr
runfromtr:
	DEV=1 deno run -A --unstable --watch=main.ts,templates/,config.yml,static/ main.ts --stage build_current,archive,build_site,serve_site --site prodhackernews
runtoarchive:
	DEV=1 deno run -A --unstable --watch=main.ts,templates/,config.yml,static/ main.ts --stage format,translate,build_current,archive,build_site,serve_site,server_archive_site --site prodhackernews
.Phony: start
start:
	DEV=1 deno run -A --unstable --watch=main.ts,templates/,config.yml,static/ main.ts --stage build_current,archive,build_site,serve_site --site prodhackernews
.Phony: load
load:
	DEV=1 deno run -A --unstable main.ts --stage load_current

.Phony: upload
upload:
	DEV=1 deno run -A --unstable main.ts --stage upload_current

.Phony: upload-archive
upload-archive:
	DEV=1 deno run -A --unstable main.ts --stage upload_archive

.Phony: fetch
fetch:
	DEV=1 deno run -A --unstable main.ts --stage fetch --site prodhackernews

.Phony: fetchall
fetchall:
	DEV=1 deno run -A --unstable main.ts --stage fetch

.Phony: format
format:
	DEV=1 deno run -A --unstable main.ts --stage format --site prodhackernews

.Phony: tr
tr:
	DEV=1 deno run -A --unstable main.ts --stage translate --site prodhackernews

.Phony: trall
trall:
	DEV=1 deno run -A --unstable main.ts --stage translate

.Phony: current
current:
	DEV=1 deno run -A --unstable main.ts --stage build_current --site prodhackernews

.Phony: site
site:
	DEV=1 deno run -A --unstable main.ts --stage build_site,serve_site --site prodhackernews

.Phony: deploy
deploy:
	DEV=1 deno run -A --unstable main.ts --stage deploy

.Phony: dev
dev:
	wrangler dev


.Phony: publish
publish:
	wrangler publish


.Phony: test
test:
	DEV=1 deno test --unstable -A

.Phony: deletedataprod
deletedataprod:
	deno run -A --unstable ./scripts/clean-current.ts
.Phony: deletearchiveprod
deletearchiveprod:
	deno run -A --unstable ./scripts/clean-archive.ts

.Phony: deletedata
deletedata:
	DEV=1 deno run -A --unstable ./scripts/clean-current.ts
.Phony: deletearchive
deletearchive:
	DEV=1 deno run -A --unstable ./scripts/clean-current.ts

.Phony: serveprodarchive
serveprodarchive:
	deno run -A ./dev-archive-site.ts