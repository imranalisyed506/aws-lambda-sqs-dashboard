.PHONY: clean clean-all start

clean:
	rm -rf .next out dist coverage .turbo .cache
	rm -f npm-debug.log* yarn-error.log* pnpm-debug.log* .DS_Store

clean-all: clean
	rm -rf node_modules

start:
	npm install
	npm run dev
