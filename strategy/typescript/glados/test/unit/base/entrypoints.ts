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

import { UnitTest } from "glados/test/unit/unittest";

export class BaseEntrypoints extends UnitTest {
	public constructor() {
		super();
		this._addTest("wrapper", this._testWrapper);
		this._addTest("duplicates", this._testDuplicates);
	}

	private static _tmp() {
		return false;
	}

	private static _wrapper_const(func: Function) {
		return func;
	}

	private static _wrapper_other(_func: any) {
		return BaseEntrypoints._wrapper_other;
	}

	private _testWrapper() {
		let name = "test";
		Entrypoints.add(name, BaseEntrypoints._tmp);

		let eps = Entrypoints.get(BaseEntrypoints._wrapper_const);
		this._assert_not_undefined(eps[name]);
		this._assert_eq(eps[name], BaseEntrypoints._tmp);

		let eps2 = Entrypoints.get(BaseEntrypoints._wrapper_other);
		this._assert_eq(eps2[name], BaseEntrypoints._wrapper_other);
	}

	private _testDuplicates() {
		Entrypoints.add("test2", BaseEntrypoints._tmp);
		this._assert_error(function() { Entrypoints.add("test", BaseEntrypoints._tmp); });
	}
}
export let testClass = BaseEntrypoints;
