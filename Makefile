ifneq (,$(wildcard ./.env))
    include .env
    export
endif
.Phony: source
source:
	deno run -A main.ts --source --site devfeed

.Phony: prod-source
prod-source:
	PROD=1 deno run -A main.ts --source

# only build site
.Phony: build
build:
	NO_SERVE=1 deno run -A main.ts --build

# only build site
.Phony: prod-build
prod-build:
	 PROD=1 deno run -A main.ts --build

.Phony: start
start:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --stage format,translate,build_current,archive,build_site,serve_site

.Phony: prod-buildfromformat
prod-buildfromformat:
	PROD=1 deno run -A main.ts --stage format,translate,build_current,archive,build_site

.Phony: serve
serve:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --stage build_site,serve_site

.Phony: site
site:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --stage format,translate,build_current,archive,build_site,serve_site --site $(name)

.Phony: all
all:
	FILES=50 deno run -A main.ts --site $(name)

.Phony: prod-serve
prod-serve:
	PROD=1 deno run -A --watch=main.ts,templates/,config.yml main.ts --serve

.Phony: fetch
fetch:
	deno run -A main.ts --stage fetch --site devfeed

.Phony: format
format:
	deno run -A main.ts --stage format --site devfeed

.Phony: archive
archive:
	deno run -A main.ts --stage archive --site devfeed

.Phony: tr
tr:
	deno run -A main.ts --stage translate --site devfeed

.Phony: realtr
realtr:
	HEADLESS=0 MOCK=0 FILES=4 deno run -A main.ts --stage translate --site devfeed


.Phony: buildcurrent
buildcurrent:
	deno run -A main.ts --stage build_current --site devfeed

.Phony: dev
dev:
	wrangler pages dev public/reddit

.Phony: install
install:
	PUPPETEER_PRODUCT=chrome deno run -A https://deno.land/x/puppeteer@14.1.1/install.ts

.Phony: load
load:
	make loadcurrent && make decompresscurrent

.Phony: prod-load
prod-load:
	make prod-loadcurrent && make prod-decompresscurrent


.Phony: upload
upload:
	make uploadcurrent && make uploadarchive

.Phony: prod-upload
prod-upload:
	make prod-uploadcurrent && make prod-uploadarchive


.Phony: loadcurrent
loadcurrent:
	wrangler r2 object get dev-feed/dev-current.zip
	
.Phony: prod-loadcurrent
prod-loadcurrent:
	wrangler r2 object get feed/current.zip

.Phony: loadarchivehttp
loadarchivehttp:
	deno run -A scripts/load-archive.ts
	
.Phony: prod-loadarchivehttp
prod-loadarchivehttp:
	PROD=1 deno run -A scripts/load-archive.ts

.Phony: prod-loadarchive
prod-loadarchive:
	aws s3 cp s3://feedarchive/archive ./archive --endpoint-url https://s3.nl-ams.scw.cloud --recursive

.Phony: prod-awsuploadarchive
prod-awsuploadarchive:
	aws s3 cp ./archive s3://feedarchive/archive --endpoint-url https://s3.nl-ams.scw.cloud --recursive

.Phony: dufsuploadarchive
dufsuploadarchive:
	curl --digest -u $(DUFS_SECRETS) -T ./dev-archive $(DUFS_URL)/dev-archive

.Phony: prod-dufsuploadarchive
prod-dufsuploadarchive:
	curl -T ./archive $(DUFS_URL)/archive

.Phony: uploadcurrent
uploadcurrent:
	make compresscurrent && curl --digest -u $(DUFS_SECRETS) -T ./dev-current.zip $(DUFS_URL)/dev-current.zip &&  wrangler r2 object put dev-feed/dev-current.zip -f ./dev-current.zip

.Phony: prod-uploadcurrent
prod-uploadcurrent:
	make prod-compresscurrent && curl --digest -u $(DUFS_SECRETS) -T ./current.zip $(DUFS_URL)/current.zip && wrangler r2 object put feed/current.zip -f ./current.zip

.Phony: uploadpublic
uploadpublic:
	deno run -A ./scripts/upload-public-to-r2.ts

.Phony: prod-uploadpublic
prod-uploadpublic:
	PROD=1 deno run -A ./scripts/upload-public-to-r2.ts


.Phony: uploadarchive
uploadarchive:
	deno run -A ./scripts/upload-archive.ts

.Phony: prod-uploadarchive
prod-uploadarchive:
	PROD=1 deno run -A ./scripts/upload-archive.ts



.Phony: compresscurrent
compresscurrent:
	deno run -A ./scripts/compress-current.ts


.Phony: prod-compresscurrent
prod-compresscurrent:
	PROD=1 deno run -A ./scripts/compress-current.ts


.Phony: decompresscurrent
decompresscurrent:
	deno run -A ./scripts/decompress-current.ts

.Phony: prod-decompresscurrent
prod-decompresscurrent:
	PROD=1 deno run -A ./scripts/decompress-current.ts



.Phony: publish
publish:
	wrangler pages publish public/$(name) --project-name $(name)

.Phony: prod-publish
prod-publish:
	make prod-build && PROD=1 deno run -A ./scripts/publish.ts

.Phony: test
test:
	make checkfmt && deno test -A

.Phony: prod-deletecurrent
prod-deletecurrent:
	PROD=1 deno run -A ./scripts/clean-current.ts

.Phony: prod-deletearchive
prod-deletearchive:
	PROD=1 deno run -A ./scripts/clean-archive.ts

.Phony: deletecurrent
deletecurrent:
	deno run -A ./scripts/clean-current.ts

.Phony: deletearchive
deletearchive:
	deno run -A ./scripts/clean-current.ts

.Phony: prod-servearchive
prod-servearchive:
	PROD=1 deno run -A ./dev-archive-site.ts

.Phony: servearchive
servearchive:
	LOCAL=0 PROD=1 deno run -A --watch=main.ts,templates/ ./dev-archive-site.ts

.Phony: checkfmt
checkfmt:
	deno fmt --check

.Phony: fmt
fmt:
	deno fmt

.Phony: test-file
test-file:
	mkdir -p current/4-data/devfeed/ && touch current/4-data/devfeed/test.json && mkdir -p archive/devfeed/tags/job/ && touch archive/devfeed/tags/job/test.json && mkdir -p public/devfeed && touch public/devfeed/index.html 

.Phony: config
config:
	deno run -A ./build-config.ts

.Phony: clean
clean:
	rm -rf current/ archive/ public/ dev-current.zip current.zip dev-current/ dev-archive/

.Phony: prod-initcurrentzip
prod-initcurrentzip:
	PROD=1 deno run -A ./scripts/init-current-zip.ts && make prod-uploadcurrent


.Phony: prod-movereddit
prod-movereddit:
	PROD=1 deno run -A ./migrations/move-reddit.ts


.Phony: temp-uploadarchive
temp-uploadarchive:
	curl bashupload.com -T ./archive.zip

.Phony: createsite
createsite:
	wrangler pages project create $(name) --production-branch main

# only for dev
.Phony: prod-zipuploadarchive
prod-zipuploadarchive:
	zip -r archive.zip archive && sleep 1 && scp ./archive.zip $(DUFS_SERVER):$(DUFS_PATH)/archive.zip