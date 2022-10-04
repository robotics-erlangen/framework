#!/bin/bash
# Exit on error and when undefined variables are accessed
set -euo pipefail

# make sure the current working directory is the location of the script
# `bash foobar.sh` seems to have foobar.sh in $0
cd "$(dirname "$0")"
# Then switch to the top level software directory
cd ../..

CURRENT_HASH="$(git rev-parse --short=12 HEAD)"


SCRATCH="$(mktemp --directory)"
function finish {
	rm -rf "$SCRATCH"
}
trap finish EXIT

mkdir --parents "$SCRATCH/build/bin"

cp --recursive strategy "$SCRATCH/"
cp build/bin/ra \
	build/bin/icudtl.dat \
	"$SCRATCH/build/bin"
cp --recursive libs/tsc "$SCRATCH/libs"
cp --recursive \
	config \
	data \
	"$SCRATCH"

cat <<EOF >"$SCRATCH/start.sh"
#!/usr/bin/env bash
exec build/bin/ra"
EOF
chmod +x "$SCRATCH/start.sh"

git -C "$SCRATCH" init
git -C "$SCRATCH" add -A
git -C "$SCRATCH" commit \
	--no-gpg-sign \
	--author "Robotics Erlangen <info@robotics-erlangen.de>" \
	-m "Initial Commit"

FILE_NAME="software-linux-prebuilt-${CURRENT_HASH}.tar.gz"
tar cfz "$FILE_NAME" --directory "$SCRATCH" .
mv "$FILE_NAME" ..
