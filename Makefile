.PHONY: check lint test build
check: lint test build

lint:
	npm run lint

test:
	npm test

build:
	npm run build
