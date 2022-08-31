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
#	PROD=1 deno run -A main.ts --stage translate
# only build site
.Phony: build
build:
	NO_SERVE=1 deno run -A main.ts --build
# only build dev site
.Phony: builddev
builddev:
	NO_SERVE=1 deno run -A main.ts --build --site devfeed
# only build site
.Phony: prod-build
prod-build:
	 PROD=1 deno run -A main.ts --build
.Phony: prod-buildsite
prod-buildsite:
	 PROD=1 deno run -A main.ts --build --site ${site}


.Phony: prod-buildfromformat
prod-buildfromformat:
	PROD=1 deno run -A main.ts --stage format,translate,build_current,archive,build_site
.Phony: start
start:
	deno run -A main.ts --site devfeed

.Phony: startsite
startsite:
	deno run -A main.ts --site ${site}

.Phony: startall
startall:
	deno run -A main.ts

.Phony: run
run:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --stage format,translate,build_current,archive,build_site,serve_site --site devfeed

.Phony: runsite
runsite:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --stage format,translate,build_current,archive,build_site,serve_site --site ${site}

.Phony: runall
runall:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --stage format,translate,build_current,archive,build_site,serve_site

.Phony: serve
serve:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --site devfeed --stage build_site,serve_site
.Phony: serveall
serveall:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --stage build_site,serve_site

.Phony: servesite
servesite:
	deno run -A --watch=main.ts,templates/,config.yml main.ts --stage build_site,serve_site --site ${site}


.Phony: prod-serve
prod-serve:
	PROD=1 deno run -A main.ts --serve --site hnnew

.Phony: prod-serveall
prod-serveall:
	PROD=1 deno run -A main.ts --serve
.Phony: prod-servesite
prod-servesite:
	PROD=1 deno run -A --watch=main.ts,templates/,config.yml main.ts --serve --site ${site}

.Phony: fetch
fetch:
	deno run -A main.ts --stage fetch --site devfeed
.Phony: fetchsite
fetchsite:
	deno run -A main.ts --stage fetch --site $(site)

.Phony: fetchall
fetchall:
	deno run -A main.ts --stage fetch


.Phony: stage
stage:
	deno run -A main.ts --stage $(stage) --site $(site)


.Phony: format
format:
	deno run -A main.ts --stage format --site devfeed

.Phony: formatsite
formatsite:
	deno run -A main.ts --stage format --site ${site}

.Phony: formatall
formatall:
	deno run -A main.ts --stage format

.Phony: archivesite
archivesite:
	deno run -A main.ts --stage archive --site devfeed

.Phony: tr
tr:
	deno run -A main.ts --stage translate --site wsj

.Phony: realtr
realtr:
	HEADLESS=1 MOCK=0 FILES=4 deno run -A main.ts --stage translate --site devfeed

.Phony: realtrall
realtrall:
	DEBUG=1 HEADLESS=0 MOCK=0 FILES=4 deno run -A main.ts --stage translate --site nytimes

.Phony: buildcurrent
buildcurrent:
	deno run -A main.ts --stage build_current --site devfeed

.Phony: dev
dev:
	wrangler pages dev public/${site}

.Phony: install
install:
	PUPPETEER_PRODUCT=chrome deno run -A https://deno.land/x/puppeteer@14.1.1/install.ts

.Phony: load
load:
	make loadcurrent

.Phony: prod-load
prod-load:
	make prod-loadcurrent


.Phony: upload
upload:
	make uploadarchive && make uploadcurrent

.Phony: prod-upload
prod-upload:
	make prod-uploadarchive && make prod-uploadcurrent


.Phony: loadcurrent
loadcurrent:
	aws s3 cp s3://feed/cache.zip ./cache.zip --endpoint-url $(AWS_ENDPOINT) && make decompresscache && aws s3 cp s3://feed/current ./current --endpoint-url $(AWS_ENDPOINT) --recursive --exclude ".*"
.Phony: prod-loadcurrent
prod-loadcurrent:
	aws s3 cp s3://feed/prod-cache.zip ./prod-cache.zip --endpoint-url $(AWS_ENDPOINT) && make decompresscache && aws s3 cp s3://feed/prod-current ./prod-current --endpoint-url $(AWS_ENDPOINT) --recursive --exclude ".*"

.Phony: loadarchivehttp
loadarchivehttp:
	deno run -A scripts/load-archive.ts
	
.Phony: prod-loadarchivehttp
prod-loadarchivehttp:
	PROD=1 deno run -A scripts/load-archive.ts

.Phony: prod-loadarchive
prod-loadarchive:
	aws s3 cp s3://feed/prod-archive ./prod-archive --endpoint-url $(AWS_ENDPOINT) --recursive --exclude ".*"

.Phony: prod-awsuploadarchive
prod-awsuploadarchive:
	aws s3 cp ./prod-archive s3://feed/prod-archive --endpoint-url $(AWS_ENDPOINT) --recursive --exclude ".*"

.Phony: uploadcurrent
uploadcurrent:
	make compresscache && curl --digest --max-time 100 -u $(DUFS_SECRETS) -T ./cache.zip $(DUFS_URL)/cache.zip && aws s3 cp ./cache.zip  s3://feed/cache.zip --endpoint-url $(AWS_ENDPOINT) && aws s3 cp ./current  s3://feed/current --endpoint-url $(AWS_ENDPOINT) --recursive --exclude ".*"


.Phony: prod-uploadcurrent
prod-uploadcurrent:
	make prod-compresscache && curl --digest --max-time 100 -u $(DUFS_SECRETS) -T ./prod-cache.zip $(DUFS_URL)/prod-cache.zip && aws s3 cp ./prod-cache.zip  s3://feed/prod-cache.zip --endpoint-url $(AWS_ENDPOINT) && aws s3 cp ./prod-current  s3://feed/prod-current --endpoint-url $(AWS_ENDPOINT) --recursive --exclude ".*"

.Phony: prod-delete-hidden
prod-delete-hidden:
	aws s3 rm s3://feed --recursive  --endpoint-url $(AWS_ENDPOINT) --exclude "*" --include "*.DS_Store"

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



.Phony: compresscache
compresscache:
	deno run -A ./scripts/compress-cache.ts


.Phony: prod-compresscache
prod-compresscache:
	PROD=1 deno run -A ./scripts/compress-cache.ts


.Phony: decompresscache
decompresscache:
	deno run -A ./scripts/decompress-cache.ts

.Phony: prod-decompresscache
prod-decompresscache:
	PROD=1 deno run -A ./scripts/decompress-cache.ts



.Phony: publish
publish:
	wrangler pages publish public/$(site) --project-name $(site)

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
	PROD=1 deno run -A --watch=main.ts,templates/ ./local-archive-site.ts

.Phony: servearchive
servearchive:
	LOCAL=1 deno run -A --watch=main.ts,templates/ ./local-archive-site.ts

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
	rm -rf current/ archive/ public/ dev/public/ prod-current/ prod-archive/ cache.zip prod-cache.zip cache/ prod-cache/

.Phony: prod-initcachezip
prod-initcachezip:
	make prod-uploadcurrent


.Phony: prod-movereddit
prod-movereddit:
	PROD=1 deno run -A ./migrations/move-reddit.ts


.Phony: temp-uploadarchive
temp-uploadarchive:
	curl bashupload.com -T ./archive.zip

.Phony: createsite
createsite:
	wrangler pages project create $(site) --production-branch main

.Phony: rebuild
rebuild:
	TODEV=1 deno run -A ./scripts/rebuild-current.ts
.Phony: prod-rebuild
prod-rebuild:
	PROD=1 deno run -A ./scripts/rebuild-current.ts
# only for dev
.Phony: prod-zipuploadarchive
prod-zipuploadarchive:
	zip -r -q prod-archive.zip prod-archive && sleep 1 && scp ./prod-archive.zip $(DUFS_SERVER):$(DUFS_PATH)/prod-archive.zip

# after upload to dufs
# cd ~/storage
# unzip -q archive.zip