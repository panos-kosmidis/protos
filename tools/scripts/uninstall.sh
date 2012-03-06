#!/bin/bash

# Uninstall from $PREFIX/lib/node if running as root
if [[ $EUID -eq 0 ]]; then
	unlink /usr/local/lib/node/corejs
	exit 0
fi