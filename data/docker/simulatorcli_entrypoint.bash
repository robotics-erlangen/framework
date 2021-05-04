#!/usr/bin/env bash
GEOMETRY_OPTION=""
if [[ -n "$GEOMETRY" ]]; then
	GEOMETRY_OPTION="--geometry=$GEOMETRY"
	echo "Passing '${GEOMETRY_OPTION}'"
fi

REALISM_OPTION=""
if [[ -n "$REALISM" ]]; then
	REALISM_OPTION="--realism=$REALISM"
	echo "Passing '${REALISM_OPTION}'"
fi

echo "Starting the ER-Force simulator-cli"
exec ./build/bin/simulator-cli "$GEOMETRY_OPTION" "$REALISM_OPTION"
