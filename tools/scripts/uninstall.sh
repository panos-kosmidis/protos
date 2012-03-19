#!/bin/bash

# Uninstall from $PREFIX/lib/node if running as root
if [[ $EUID -eq 0 ]]; then
	unlink /usr/local/lib/node/protos &> /dev/null
	exit 0
fi