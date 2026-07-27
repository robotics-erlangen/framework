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

import * as Cache from "base/cache";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseCache extends UnitTest {
	public constructor() {
		super();
		this._addTest("different arguments", this._testDifferentArguments);
		this._addTest("undefined parameters", this._testUndefinedParameters);
		this._addTest("parameters", this._testParameters);
		this._addTest("side effects", this._testSideEffects);
		this._addTest("heavy", this._testHeavy);
		this._addTest("forever", this._testForever);
		this._addTest("function name", this._testFunctionName);
	}

	private _testFunctionName() {
		function bar() {
			return 4;
		}
		function foo() {
			return 5;
		}
		let cachedBar = Cache.forFrame(bar);
		let cachedFoo = Cache.forFrame(foo);

		this._assert_eq(bar.name, cachedBar.name);
		this._assert_eq(foo.name, cachedFoo.name);
	}

	private _testDifferentArguments() {
		function foo(a: number, b: number, c: number) {
			return a * (b + c);
		}
		let cached = Cache.forFrame(foo);

		let a = cached(1, 2, 3);
		let b = cached(2, 3, 4);
		this._assert_ne(a, b);
	}

	private _testUndefinedParameters() {
		function bar() {
			return 4;
		}
		let cached: Function = Cache.forFrame(bar);

		// unused and undefined parameters should not pose problems (multiple calls are ok)
		let a = cached();
		let b = cached("bla");
		let c = cached(undefined, 7);
		// equal to a
		let d = cached(undefined, undefined, undefined);
		this._assert_eq(a, 4);
		this._assert_eq(b, 4);
		this._assert_eq(c, 4);
		this._assert_eq(d, 4);
	}

	private _testParameters() {
		function echo(...args: any[]) {
			return args;
		}
		let cached: any = Cache.forFrame(echo);

		let a = cached();
		let b = cached("bla");
		let c = cached(undefined, 7);
		let d = cached(undefined, undefined, undefined, 5);
		this._assert_deep_eq(a, []);
		this._assert_deep_eq(b, ["bla"]);
		this._assert_deep_eq(c, [undefined, 7]);
		this._assert_deep_eq(d, [undefined, undefined, undefined, 5]);
	}

	private _testSideEffects() {
		let side = 0;
		function sideEffect() {
			side = side + 1;
		}
		let cached = Cache.forFrame(sideEffect);

		cached();
		let before = side;
		cached();
		let after = side;
		this._assert_eq(before, after);

		Cache.resetFrame();
		cached();
		let afterReset = side;
		this._assert_eq(after + 1, afterReset);
	}

	private _testHeavy() {
		function heavy() {
			let a = 0;
			for (let i = 0; i < 1000000; i++) {
				a = a + i;
			}
		}
		let cached = Cache.forFrame(heavy);

		// some number-crunching for time-measuring
		for (let i = 0; i < 100000; i++) {
			cached();
		}
		this._assert_true(true);
	}

	private _testForever() {
		let side = 0;
		function sideEffect() {
			side = side + 1;
		}
		let cached = Cache.forever(sideEffect);

		let before = side;
		cached();
		let mid = side;
		cached();
		let after = side;
		this._assert_eq(before + 1, mid);
		this._assert_eq(mid, after);

		Cache.resetFrame();
		cached();
		let afterReset = side;
		this._assert_eq(after, afterReset);
	}
}
export let testClass = BaseCache;
