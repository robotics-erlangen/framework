#!/bin/bash

# predictable working directory
cd "$(dirname "$0")"

for i in {ubuntu-16.04,ubuntu-18.04,ubuntu-20.04}; do
	v8dir="$i/libs/v8"
	mkdir -p "$v8dir"
	cp -r ../../libs/v8/{build.sh,patches} "$v8dir"
done
