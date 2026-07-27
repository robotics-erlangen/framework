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

import * as TryCatch from "base/trycatch";

import { UnitTest } from "glados/test/unit/unittest";

function fail(): void {
	throw new Error("Should fail");
}

let cond = true;

function falsify(): void {
	cond = false;
}

function combine(a: () => void, b: () => void) {
	return () => {
		a();
		b();
	};
}

function ignore(): void {
}

export class BaseTryCatch extends UnitTest {
	public constructor() {
		super();
		this._addTest("pcall", this._testPCall);
		this._addTest("tryCatch", this._testTryCatch);
		this._addTest("tryCatchThen", this._testTryCatchThen);
	}


	private _testPCall() {
		// check that function will be executed
		cond = true;
		this._assert_false(TryCatch.pcall(falsify));
		this._assert_false(cond);

		// As any caught error will be displayed in the logwidged by c++, we do not continue testing here.
		// Pcall is already beeing used in the testframework quite a bit, and therefore its features should be correct.
	}

	private _testTryCatch() {
		// check that try will be executed
		cond = true;
		TryCatch.tryCatch(falsify, ignore);
		this._assert_false(cond);

		// check that try execution will not continue after an error
		cond = true;
		TryCatch.tryCatch(combine(fail, falsify), ignore);
		this._assert_true(cond);

		// check that try execution will happen until the error is encountered
		cond = true;
		TryCatch.tryCatch(combine(falsify, fail), ignore);
		this._assert_false(cond);

		// check that catch will not be executed if no error occured
		cond = true;
		TryCatch.tryCatch(ignore, falsify);
		this._assert_true(cond);

		// check that catch will be executed if an error occured
		cond = true;
		TryCatch.tryCatch(fail, falsify);
		this._assert_false(cond);

		// check that throwing in catch works
		this._assert_error(() => TryCatch.tryCatch(fail, fail));

		// check that the error object will arrive correctly
		let o: Object = new Object();
		TryCatch.tryCatch(() => { throw o; }, (e: any) => { this._assert_eq(e, o); });
		this._assert_error(() => TryCatch.tryCatch(fail, (e: any) => { this._assert_eq(e, o); }));

		// check that the error object will arrive correctly from catch
		TryCatch.tryCatch(() => { TryCatch.tryCatch(fail, () => { throw o; }); }, (e: any) => { this._assert_eq(e, o); });
		this._assert_error(() => { TryCatch.tryCatch(() => { TryCatch.tryCatch(fail, () => { throw o; }); }, (e: any) => { this._assert_eq(e, new Object()); }); });
	}

	private _testTryCatchThen() {
		// check that try will be executed
		cond = true;
		TryCatch.tryCatchThen(falsify, ignore, ignore);
		this._assert_false(cond);

		// check that catch will not be executed if no error occured
		cond = true;
		TryCatch.tryCatchThen(ignore, falsify, ignore);
		this._assert_true(cond);

		// check that then will be executed if no error occured
		cond = true;
		TryCatch.tryCatchThen(ignore, ignore, falsify);
		this._assert_false(cond);

		// check that catch will be executed if an error occured
		cond = true;
		TryCatch.tryCatchThen(fail, falsify, ignore);
		this._assert_false(cond);

		// check that then will not be executed if an error occured
		cond = true;
		TryCatch.tryCatchThen(fail, ignore, falsify);
		this._assert_true(cond);

		// check that throwing in catch works
		this._assert_error(() => TryCatch.tryCatchThen(fail, fail, ignore));

		// check that throwing in then works
		this._assert_error(() => TryCatch.tryCatchThen(ignore, ignore, fail));

		// check that the error object will arrive correctly
		let o: Object = new Object();
		TryCatch.tryCatchThen(() => { throw o; }, (e: any) => { this._assert_eq(e, o); }, ignore);
		this._assert_error(() => TryCatch.tryCatchThen(fail, (e: any) => { this._assert_eq(e, o); }, ignore));
	}
}
export let testClass = BaseTryCatch;
