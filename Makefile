watch:
	npx tsc -w
build:
	[ -d "node_modules" ] || npm install
	npx tsc
run:
	node --enable_source_maps out/index.js
count:
	ag -g 'ts$$' --ignore='tests' | xargs wc -l
