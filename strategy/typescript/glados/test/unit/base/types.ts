/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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

import * as Types from "base/types";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseTypes extends UnitTest {
	public constructor() {
		super();
		this._addTest("parameterizeClass", this._testParameterizeClass);
	}

	private _testParameterizeClass() {
		/* Check whether parameterizeClass propagates the class name */
		class SomeWeirdName {
			public constructor(_first: number, _second: number) {
				/* empty */
			}
		}

		const hasNameTest = Types.parameterizeClass(SomeWeirdName, 1);
		this._assert_eq(SomeWeirdName.name, hasNameTest.name);
		this._assert_eq(new SomeWeirdName(420, 42).constructor.name, new hasNameTest(42).constructor.name);

	}
}
export let testClass = BaseTypes;
