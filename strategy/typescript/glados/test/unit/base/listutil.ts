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

import * as ListUtil from "base/listutil";

import { UnitTest } from "glados/test/unit/unittest";
export class BaseListUtil extends UnitTest {
	public constructor() {
		super();
		this._addTest("_testMax", this._testMax);
		this._addTest("_testMin", this._testMin);
		this._addTest("_testPartition", this._testPartition);
		this._addTest("_testRange", this._testRange);
		this._addTest("_testLinspace", this._testLinspace);
		this._addTest("_testZip", this._testZip);
	}

	private _testMin() {
		let array = [1, 0, 4, 5, 7, 6, 3, 3, 9];
		this._assert_eq(ListUtil.min(array, (x) => x)[0], 0);
		let [result, value] = ListUtil.min(array, (x) => 10 - x);
		this._assert_eq(result, 9);
		this._assert_eq(value, 1);
		this._assert_eq(ListUtil.min([] as number[], (a) => a)[0], undefined);
	}

	private _testMax() {
		let array = [1, 0, 4, 5, 7, 6, 3, 3, 9];
		this._assert_eq(ListUtil.max(array, (x) => x)[0], 9);
		let [result, value] = ListUtil.max(array, (x) => 10 - x);
		this._assert_eq(result, 0);
		this._assert_eq(value, 10);

		this._assert_eq(ListUtil.max([] as number[], (a) => a)[0], undefined);
	}

	private _testPartition() {
		let array = [1, 0, 3, 2, 4, 7, 6, 9];
		let [accept, reject] = ListUtil.partition(array, (x) => x % 2 === 0);
		this._assert_true(accept.some((x) => x === 0));
		this._assert_true(accept.some((x) => x === 2));
		this._assert_true(accept.some((x) => x === 4));
		this._assert_true(accept.some((x) => x === 6));
		this._assert_eq(accept.length, 4);
		this._assert_true(reject.some((x) => x === 1));
		this._assert_true(reject.some((x) => x === 3));
		this._assert_true(reject.some((x) => x === 7));
		this._assert_true(reject.some((x) => x === 9));
		this._assert_eq(reject.length, 4);
	}

	private _testRange() {
		this._assert_deep_eq(ListUtil.range(0, 1), [0]);
		this._assert_deep_eq(ListUtil.range(2, 4), [2, 3]);
		this._assert_deep_eq(ListUtil.range(3, 10), [3, 4, 5, 6, 7, 8, 9]);
		this._assert_deep_eq(ListUtil.range(0, 10), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		this._assert_deep_eq(ListUtil.range(-2, 10), [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

		this._assert_deep_eq(ListUtil.range(0, 0), []);
		this._assert_deep_eq(ListUtil.range(-1, -1), []);
		this._assert_deep_eq(ListUtil.range(4, 4), []);
		this._assert_deep_eq(ListUtil.range(4, 2), []);
	}

	private _testLinspace() {
		const args = [
			[10, -1, 1],
			[12, -10, 21],
			[3, 0, 20],
			[2, 0, 2],
			[1, 0, 20],
			[0, 0, 20],
		];
		for (const [len, min, max] of args) {
			const lin = ListUtil.linspace(len, min, max);

			// check length
			this._assert_eq(
				lin.length, len,
				() => `linspace(${len}, ${min}, ${max}) = [${lin}] is not of length ${len}`,
			);

			// check only for lists with at least two elements
			if (len >= 2) {
				// check min and max
				this._assert_eq_eps(
					Math.min(...lin), min, 1e-6,
					() => `linspace(${len}, ${min}, ${max}) = [${lin}] does not contain ${min}`,
				);
				this._assert_eq_eps(
					Math.max(...lin), max, 1e-6,
					() => `linspace(${len}, ${min}, ${max}) = [${lin}] does not contain ${max}`,
				);

				// check ascending order and step size
				const step = lin[1] - lin[0];
				for (let i = 0; i < len - 1; i++) {
					this._assert_lt(
						lin[i], lin[i + 1],
						() => `linspace(${len}, ${min}, ${max}) = [${lin}] is not strictly increasing from index ${i} to ${i + 1}`,
					);
					this._assert_eq_eps(
						lin[i + 1] - lin[i], step, 1e-6,
						() => `linspace(${len}, ${min}, ${max}) = [${lin}] is not equally spaced between index ${i} to ${i + 1}`,
					);
				}
			}
		}
	}

	private _testZip() {
		this._assert_deep_eq(ListUtil.zip([], []), []);
		this._assert_deep_eq(ListUtil.zip([1, 2, 3], []), []);
		this._assert_deep_eq(ListUtil.zip([], ["a", "b", "c"]), []);

		this._assert_deep_eq(ListUtil.zip(["a", "b", "c"], [1, 2, 3]), [["a", 1], ["b", 2], ["c", 3]]);
		this._assert_deep_eq(ListUtil.zip(["a", "b"], [1, 2, 3]), [["a", 1], ["b", 2]]);
		this._assert_deep_eq(ListUtil.zip(["a", "b", "c"], [1, 2]), [["a", 1], ["b", 2]]);
	}
}
export let testClass = BaseListUtil;
