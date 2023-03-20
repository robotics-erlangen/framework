#!/bin/sh

SCRIPT_DIR="$( dirname -- $( realpath "$0" ) )"
TOP_LEVEL_DIR="${SCRIPT_DIR}/../.."

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

if ! npm ci --prefix "${TOP_LEVEL_DIR}"; then
	echo "Probably could not find package-lock.json. Now trying to install only with package.json"
	if ! npm install --prefix "${TOP_LEVEL_DIR}"; then
		die "Failed to run npm install"
	fi
fi

echo "${FBOLD}Apply patch to typescript-eslint-language-service"
patch -u "${TOP_LEVEL_DIR}"/node_modules/typescript-eslint-language-service/lib/eslint-adapter.js -i "${TOP_LEVEL_DIR}"/tools/eslint-plugin-erforce/eslint-adapter.js.patch
patch -u "${TOP_LEVEL_DIR}"/node_modules/typescript-eslint-language-service/lib/eslint-config-provider.js -i "${TOP_LEVEL_DIR}"/tools/eslint-plugin-erforce/eslint-config-provider.js.patch

echo "${FBOLD}Copying custom typescript compiler${FNORMAL}"

# check for permission to read the tsc directory
# (and for existence thereof)
# note that files could still be unreadable
CUSTOM_TSC_DIR="${TOP_LEVEL_DIR}/libs/tsc/built/local"
if [ ! -r "$CUSTOM_TSC_DIR" ]; then
	die "Could not read from '$CUSTOM_TSC_DIR'"
fi

if ! cp -R "$CUSTOM_TSC_DIR/." "${TOP_LEVEL_DIR}/node_modules/typescript/lib/"; then
	die "Failed to copy files"
fi

echo "${FBOLD}Done${FNORMAL}"
