
# Reusable commands & options

vows = ./node_modules/vows/bin/vows
vowsOpts = --spec

# Test directories

unit = ./test/unit/*.js
storages = ./test/storages/*.js
drivers = ./test/drivers/*.js
engines = ./test/engines/*.js
integration = ./test/integration/*.js
middleware = ./test/middleware/*.js
commandline = ./test/command.js

# Make commands

default:
		@echo -e "\n\033[1;32m♢ Project Tasks\033[0m\n"
		@echo -e "\033[1;31mmake docs\033[0m             Generate the API Documentation"
		@echo -e "\033[1;31mmake deps\033[0m             Install Dependencies & Cleanup"
		@echo -e "\033[1;31mmake lint\033[0m             Run Code Analysis tool (scans entire project)"
		@echo -e "\033[1;31mmake testconfig\033[0m       Test Configuration Tool"
		@echo -e "\n\033[1;32m♢ Test Suites\033[0m\n"
		@echo -e "\033[1;31mmake tests\033[0m            Run All tests"
		@echo -e "\033[1;31mmake test-unit\033[0m        Run Unit tests"
		@echo -e "\033[1;31mmake test-sto\033[0m         Run Storage tests (testconfig required)"
		@echo -e "\033[1;31mmake test-drv\033[0m         Run Driver tests (testconfig required)"
		@echo -e "\033[1;31mmake test-eng\033[0m         Run View Engine tests"
		@echo -e "\033[1;31mmake test-int\033[0m         Run Integration tests"
		@echo -e "\033[1;31mmake test-mid\033[0m         Run Middleware tests"
		@echo -e "\033[1;31mmake test-cmd\033[0m         Run command line tests"
		@echo

docs:
		@./tools/doc/gen-docs.sh

deps:
		@npm install -d
		@./tools/remove-sys-notice

lint:
		@ls -F | egrep / | egrep -v "(node_modules|test|docs|build|doctmp|resources)" | NODE_ENV=lintall xargs -n 1 ./tools/lint
		@echo

testconfig:
		@./tools/testconfig

test:
		@echo "\n\033[1;30mAvailable Test Commands\033[0m: tests  test-unit  test-sto test-drv test-eng test-int test-mid\n"

tests:
		@${vows} ${vowsOpts} ${unit} ${storages} ${drivers} ${engines} ${integration} ${middleware} ${commandline}

test-unit:
		@${vows} ${vowsOpts} ${unit}

test-sto:
		@${vows} ${vowsOpts} ${storages}

test-drv:
		@${vows} ${vowsOpts} ${drivers}

test-eng:
		@${vows} ${vowsOpts} ${engines}

test-int:
		@${vows} ${vowsOpts} ${integration}

test-mid:
		@${vows} ${vowsOpts} ${middleware}
		
test-cmd:
		@${vows} ${vowsOpts} ${commandline}

.PHONY: test docs