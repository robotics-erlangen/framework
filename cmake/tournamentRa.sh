#!/bin/bash
ulimit -c unlimited

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

while true; do
		"$SCRIPT_DIR/bin/ra" -t
		if [ $? -eq 0 ]; then
				break;
		fi
		echo $?
done
