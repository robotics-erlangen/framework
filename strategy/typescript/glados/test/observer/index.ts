import * as Entrypoints from "base/entrypoints";

import * as Ball from "glados/test/observer/ball";
import * as Defense from "glados/test/observer/defense";
import * as Goal from "glados/test/observer/goal";
import * as Path from "glados/test/observer/path";
import * as Robot from "glados/test/observer/robot";

type Module = { [fn: string]: () => void };

// Loads every test
const TESTS: { [name: string]: Module } = {
	Ball,
	Defense,
	Goal,
	Path,
	Robot,
};

const TEST_NAME_REGEX = /^test(.+)/;

for (const [name, mod] of Object.entries(TESTS)) {
	for (const [functionName, fn] of Object.entries(mod)) {
		const testname = TEST_NAME_REGEX.exec(functionName);
		if (!testname) {
			continue;
		}
		Entrypoints.add(`ObserverTest/${name}/${testname[1]}`, () => {
			fn();
			return false;
		});
	}
}
