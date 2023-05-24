watch:
	npx tsc -w
build:
	[ -d "node_modules" ] || npm install
	npx tsc
run:
	node out/index.js
