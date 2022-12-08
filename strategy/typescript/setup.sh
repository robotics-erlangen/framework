#!/bin/sh

FBOLD=""
FNORMAL=""
setup_pretty_printing() {
	if ! command -v "tput" >/dev/null; then
		return
	fi
	FBOLD="$(tput bold 2>/dev/null)"
	if [ "$?" -ne "0" ]; then
		FBOLD=""
		return
	fi
	FNORMAL="$(tput sgr0 2>/dev/null)"
	if [ "$?" -ne "0" ]; then
		FBOLD=""
		FNORMAL=""
		return
	fi
}
setup_pretty_printing

die() {
	echo "${FBOLD}ERROR:${FNORMAL} $1"
	exit 1
}

# make sure the current working directory is the location of the script
cd "$(dirname "$0")"

# check if npm exists
if ! command -v "npm" >/dev/null; then
	die "'npm' not found in PATH"
fi

echo "${FBOLD}Installing packages from npm...${FNORMAL}"

if ! npm ci; then
	if ! npm install; then
		die "Failed to run npm install"
	fi
fi

echo "${FBOLD}Fixing node_modules/@types/index.d.ts${FNORMAL}"
# for whatever reason @types/json5/index.d.ts has some unnecessary unexpected character in the beginning,
# that crashes our compiler if not removed
tail +4c node_modules/@types/json5/index.d.ts > tmpIndex.ts && mv tmpIndex.ts node_modules/@types/json5/index.d.ts

echo "${FBOLD}Copying custom typescript compiler${FNORMAL}"

# check for permission to read the tsc directory
# (and for existence thereof)
# note that files could still be unreadable
CUSTOM_TSC_DIR="../../libs/tsc/built/local"
if [ ! -r "$CUSTOM_TSC_DIR" ]; then
	die "Could not read from '$CUSTOM_TSC_DIR'"
fi

if ! cp -R "$CUSTOM_TSC_DIR/." "node_modules/typescript/lib/"; then
	die "Failed to copy files"
fi

echo "${FBOLD}Done${FNORMAL}"
