/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

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
