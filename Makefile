.PHONY: test
test:
	./node_modules/mocha/bin/mocha --ui tdd test/setup.js test/*-test.js

.PHONY: test-server
test-server:
	./node_modules/test-agent/bin/js-test-agent server --growl
