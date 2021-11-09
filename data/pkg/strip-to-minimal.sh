#!/bin/bash
# CAUTION
# This will destroy the repo be removing .git

# Exit on error and when undefined variables are accessed
set -euo pipefail

read -p "This will destroy your repo by removing .git. Are you sure? [y/N] " -n 1 -r
echo
if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
	exit 1
fi

# make sure the current working directory is the location of the script
cd "$(dirname "$0")"
# goto repo root
cd ../..

current_hash="$(git rev-parse --short=12 HEAD)"

rm -rf .git/ .gitignore autoref strategy/lua/

cd src

rm -rf loganalyzer logcuttercli replaycli trajectorycli visionanalyzer
sed -i '/add_subdirectory(replaycli)/d' CMakeLists.txt
sed -i '/add_subdirectory(visionanalyzer)/d' CMakeLists.txt
sed -i '/add_subdirectory(logcuttercli)/d' CMakeLists.txt
sed -i '/add_subdirectory(loganalyzer)/d' CMakeLists.txt
sed -i '/add_subdirectory(trajectorycli)/d' CMakeLists.txt

cd firmware
rm -rf 2012 2014 2015 2018
sed -i '/add_subdirectory(2012)/d' CMakeLists.txt
sed -i '/add_subdirectory(2014)/d' CMakeLists.txt
sed -i '/add_subdirectory(2015)/d' CMakeLists.txt
sed -i '/add_subdirectory(2018)/d' CMakeLists.txt

cd ../../
git init
git add -A
git commit \
	--no-gpg-sign \
	--author "Robotics Erlangen <info@robotics-erlangen.de>" \
	-m "Initial Commit"

# Delete unneeded V8 artifacts
cd libs
find v8 -maxdepth 1 ! -name 'v8' -exec rm -rf {} \; ; \
find v8/v8 -maxdepth 1 ! -name 'v8' ! -name 'include' ! -name 'out' -exec rm -rf {} \; ; \
find v8/v8/out/x64.release/ -maxdepth 1  ! -name 'x64.release' ! -regex '.+\.so\|.+\.dat\|.+\.bin' -exec rm -rf {} \; ; \
rm v8/v8/out/x64.release/libv8_for_testing.so; \
cd ..

cd ..
tar cfz "software-${current_hash}.tar.gz" software
