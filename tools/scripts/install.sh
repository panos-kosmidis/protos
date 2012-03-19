#!/bin/bash

# Install into $PREFIX/lib/node if running as root
if [[ $EUID -eq 0 ]]; then
	ln -sF "${PWD}" /usr/local/lib/node/protos
fi