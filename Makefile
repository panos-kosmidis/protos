
# Reusable commands & options

vows = ./node_modules/vows/bin/vows
vowsOpts = --spec

# Test directories

unit = ./test/unit/*.js
special = ./test/special/*.js
integration = ./test/integration/*.js

# Make commands

default:
		@echo
		@echo "\033[1;31mmake deps\033[0m             Dependency Install & Cleanup"
		@echo "\033[1;31mmake testconfig\033[0m       Test Configuration Tool"
		@echo "\033[1;31mmake tests\033[0m            Runs All tests"
		@echo "\033[1;31mmake test-unit\033[0m        Runs Unit tests"
		@echo "\033[1;31mmake test-spec\033[0m        Runs Special tests"
		@echo "\033[1;31mmake test-int\033[0m         Runs Integration tests"
		@echo

deps:
		@npm install
		@./tools/remove-sys-notice

testconfig:
		@./tools/testconfig

test:
		@echo "\n\033[1;30mAvailable Test Commands\033[0m: tests  test-unit  test-spec  test-int\n"

tests:
		@${vows} ${vowsOpts} ${unit} ${special} ${integration}

test-unit:
		@${vows} ${vowsOpts} ${unit}
		
test-spec:
		@${vows} ${vowsOpts} ${special}
		
test-int:
		@${vows} ${vowsOpts} ${integration}

.PHONY: test