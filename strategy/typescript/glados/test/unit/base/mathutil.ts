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

import * as MathUtil from "base/mathutil";
import { Vector } from "base/vector";

const EPS = 1E-12;

import { UnitTest } from "glados/test/unit/unittest";

function uniformDistributionFunction(x: number) {
	if (x < 0) {
		return 0;
	}

	if (x > 1) {
		return 1;
	}

	return x;
}

function twoUniformDistributionFunction(x: number): number {
	if (x < 0) {
		return 0;
	}

	if (x > 2) {
		return 1;
	}

	if (x < 1) {
		return 0.5 * x * x;
	}

	return 1 - twoUniformDistributionFunction(2 - x);
}

function twoDice(x: number): number {
	if (x >= 8) {
		return 1 - twoDice(13 - x);
	}
	if (x < 2) {
		return 0;
	}
	if (x < 3) {
		return 1 / 36; // 1 and 1
	}
	if (x < 4) {
		return 3 / 36; // + 2 and 1 (either order)
	}
	if (x < 5) {
		return 6 / 36; // + 3 and 1 (either order) + 2 and 2
	}
	if (x < 6) {
		return 10 / 36; // + 3 and 2 (either order), +4 and 1 (either order)
	}
	if (x < 7) {
		return 15 / 36; // + (3,3), (2, 4), (1, 5)
	} else /* if ( x < 8 ) */ {
		return 21 / 36; // + (3, 4), (2, 5), (1, 6)
	}
}

function integerDistribution(from: number, to: number): (x: number) => number {
	return (x) => {
		if (x < from) {
			return 0;
		}
		if (x > to) {
			return 1;
		}
		let steps = to - from + 1;
		let relX = x - from + 1;
		let res = Math.floor(relX) / steps;
		return res;
	};
}


export class BaseMathUtil extends UnitTest {
	public constructor() {
		super();
		this._addTest("bound", this._testBound);
		this._addTest("roundTowards", this._testRoundTowards);
		this._addTest("roundUpwards", this._testRoundUpwards);
		this._addTest("round", this._testRound);
		this._addTest("solveLine", this._testSolveLin);
		this._addTest("solveSq", this._testSolveSq);
		this._addTest("solveSqComplex", this._testSolveSqComplex);
		this._addTest("solveCubComplex", this._testSolveCubComplex);
		this._addTest("sign", this._testSign);
		this._addTest("average", this._testAverage);
		this._addTest("variance", this._testVariance);
		this._addTest("RNGBounds", this._testUniformBounds);
		this._addTest("RNGSeed", this._testSeeding);
		this._addTest("RNGUniformDistribution", this._testUniformDistribution);
		this._addTest("RNGIndependendUniform", this._testIndependendUniform);
		this._addTest("RNGMultiUniform", this._testMultipleUniform);
		this._addTest("RNGMultiSeed", this._testDifferentSeed);
		this._addTest("RNGIntegerDistribution", this._testIntegerDistribution);
		this._addTest("RNGtwoDice", this._testTwoDice);
		this._addTest("RNGmultiSeedTwoDice", this._testDifferentSeedTwoDice);
	}

	private _testBound() {
		this._assert_eq(MathUtil.bound(1, 2, 3), 2);
		this._assert_eq(MathUtil.bound(1, 4, 3), 3);
		this._assert_eq(MathUtil.bound(1, 0, 3), 1);
		this._assert_eq(MathUtil.bound(1, -Infinity, 3), 1);
		this._assert_eq(MathUtil.bound(1, Infinity, 3), 3);
	}

	private _testRoundTowards() {
		this._assert_eq(MathUtil.roundTowards(2.5, 3, 0), 3);
		this._assert_eq(MathUtil.roundTowards(2.4, 3, 0.2), 3);
		this._assert_eq(MathUtil.roundTowards(2.399, 3, 0.2), 2);
		this._assert_eq(MathUtil.roundTowards(2.399, 3, 0.2), 2);
		this._assert_eq(MathUtil.roundTowards(2.449, 3, 0.1), 2);
		this._assert_eq(MathUtil.roundTowards(2.551, 2, 0.1), 3);
		this._assert_eq(MathUtil.roundTowards(1.49, 3, 0.1), 1);
		this._assert_eq(MathUtil.roundTowards(4.51, 3, 0.1), 5);
	}

	private _testRoundUpwards() {
		this._assert_eq(MathUtil.roundUpwards(2, 0.1), 2);
		this._assert_eq(MathUtil.roundUpwards(1.5, 0), 2);
		this._assert_eq(MathUtil.roundUpwards(1.4, 0.1), 2);
		this._assert_eq(MathUtil.roundUpwards(1.39, 0.1), 1);
		this._assert_eq(MathUtil.roundUpwards(2.39, 0.1), 2);
		this._assert_eq(MathUtil.roundUpwards(-2.55, 0.1), -2);
		this._assert_eq(MathUtil.roundUpwards(-2.45, 0), -2);
		this._assert_eq(MathUtil.roundUpwards(-2.61, 0.1), -3);
	}

	private _testRound() {
		this._assert_eq(MathUtil.round(2.45), 2);
		this._assert_eq(MathUtil.round(2.45, 0), 2);
		this._assert_eq(MathUtil.round(2.45, 1), 2.5);
		this._assert_eq(MathUtil.round(2.45, 2), 2.45);
		this._assert_eq(MathUtil.round(0.0001), 0);
		this._assert_eq(MathUtil.round(0.0001, 0), 0);
		this._assert_eq(MathUtil.round(0.0001, 1), 0);
		this._assert_eq(MathUtil.round(0.0001, 2), 0);
		this._assert_eq(MathUtil.round(0.0001, 3), 0);
		this._assert_eq(MathUtil.round(123, 0), 123);
		this._assert_eq(MathUtil.round(123, -1), 120);
		this._assert_eq_eps(MathUtil.round(123, -2), 100, EPS);
		this._assert_eq(MathUtil.round(2.5, 0), 3);
	}

	private _testSolveLin() {
		this._assert_eq(MathUtil.solveLin(1, 2), -2);
		this._assert_eq(MathUtil.solveLin(0, 2), undefined);
		this._assert_eq(MathUtil.solveLin(2, -1), 0.5);
		this._assert_eq(MathUtil.solveLin(-2, -1), -0.5);
		this._assert_eq(MathUtil.solveLin(4, 2), -0.5);
		this._assert_eq(MathUtil.solveLin(-4, -2), -0.5);
	}

	private _testSolveSq() {
		let [x1, x2] = MathUtil.solveSq(1, 0, -1);
		this._assert_eq(x1, 1);
		this._assert_eq(x2, -1);

		[x1, x2] = MathUtil.solveSq(3, -15, 18);
		this._assert_eq(x1, 2);
		this._assert_eq(x2, 3);

		// verify numeric stability
		// (x-a)(x-b) = x*x-(a+b)*x+a*b = 0
		[x1, x2] = MathUtil.solveSq(1, -1e9 - 1e-9, 1e9 * 1e-9);
		this._assert_eq(x1, 1e-9);
		this._assert_eq(x2, 1e9);

		[x1, x2] = MathUtil.solveSq(1, 0, 0);
		this._assert_eq(x1, 0);
		this._assert_eq(x2, undefined);

		[x1, x2] = MathUtil.solveSq(1, -2, 1);
		this._assert_eq(x1, 1);
		this._assert_eq(x2, undefined);

		[x1, x2] = MathUtil.solveSq(1, -2, 1);
		this._assert_eq(x1, 1);
		this._assert_eq(x2, undefined);

		[x1, x2] = MathUtil.solveSq(1, 0, 1);
		this._assert_eq(x1, undefined);
		this._assert_eq(x2, undefined);

		[x1, x2] = MathUtil.solveSq(0, 1, 2);
		this._assert_eq(x1, -2);
		this._assert_eq(x2, undefined);

		[x1, x2] = MathUtil.solveSq(0, 0, 2);
		this._assert_eq(x1, undefined);
		this._assert_eq(x2, undefined);
	}

	private _testSolveSqComplex() {
		let list = MathUtil.solveSqComplex(1, 2, 2);
		this._assert_eq(list.length, 2);
		this._assert_not_undefined(list.find((value) => value.distanceToSq(new Vector(-1, 1)) < 1e-10));
		this._assert_not_undefined(list.find((value) => value.distanceToSq(new Vector(-1, -1)) < 1e-10));

		list = MathUtil.solveSqComplex(1, 0, 0);
		this._assert_eq(list.length, 1);
		this._assert_deep_eq(list[0], new Vector(0, 0));

		this._assert_eq(MathUtil.solveSqComplex(0, 7853, 6)[0].x, MathUtil.solveLin(7853, 6));
	}

	private _testSolveCubComplex() {
		let list = MathUtil.solveCubComplex(1, 1, 1, 1);
		this._assert_eq(list.length, 3);
		this._assert_not_undefined(list.find((value) => value.distanceToSq(new Vector(-1, 0)) < 1e-10));
		this._assert_not_undefined(list.find((value) => value.distanceToSq(new Vector(-0, 1)) < 1e-10));
		this._assert_not_undefined(list.find((value) => value.distanceToSq(new Vector(-0, -1)) < 1e-10));

		list = MathUtil.solveCubComplex(1, 0, 0, 0);
		this._assert_eq(list.length, 1);
		this._assert_deep_eq(list[0], new Vector(0, 0));

		this._assert_deep_eq(MathUtil.solveCubComplex(0, 5412, 7853, 6), MathUtil.solveSqComplex(5412, 7853, 6));
		this._assert_eq(MathUtil.solveCubComplex(0, 0, 76, 324)[0].x, MathUtil.solveLin(76, 324));
	}

	private _testSign() {
		this._assert_eq(MathUtil.sign(0), 0);
		this._assert_eq(MathUtil.sign(-0), 0);
		this._assert_eq(MathUtil.sign(-0.01), -1);
		this._assert_eq(MathUtil.sign(0.01), 1);
		this._assert_eq(MathUtil.sign(-100), -1);
		this._assert_eq(MathUtil.sign(100), 1);
	}

	private _testAverage() {
		let array = [1, 2, 3, 4, 0];
		this._assert_eq(MathUtil.average(array), 2);
		this._assert_eq(MathUtil.average(array, 0, 5), 2);
		this._assert_eq(MathUtil.average(array, 1, 4), 3);
		this._assert_eq(MathUtil.average(array, 3, 4), 4);
	}

	private _testVariance() {
		let array = [1, 2, 3, 4, 0];
		this._assert_eq(MathUtil.variance(array), 2);
		this._assert_eq(MathUtil.variance(array, 2), 2);
		this._assert_eq(MathUtil.variance(array, undefined, 0, 5), 2);
		this._assert_eq(MathUtil.variance(array, 2, 0, 5), 2);
		this._assert_eq(MathUtil.variance(array, undefined, 1, 4), 2 / 3);
		this._assert_eq(MathUtil.variance(array, 3, 1, 4), 2 / 3);
		this._assert_eq(MathUtil.variance(array, undefined, 3, 4), 0);
	}

	// The following tests are a simple port of src/tests/core/rng.cpp

	private _testUniformBounds() {
		MathUtil.randomseed(155);
		const runs = 50;
		for (let i = 0; i < runs; ++i) {
			let uniform = MathUtil.random();
			this._assert_le(0, uniform);
			this._assert_lt(uniform, 1);
		}
	}

	private _testSeeding() {
		MathUtil.randomseed(155);
		const runs = 50;
		let values = [];
		for (let i = 0; i < runs; ++i) {
			values.push(MathUtil.random());
			values.push(MathUtil.randomInt([0, 5]));
			values.push(MathUtil.randomInt([10, 50]));
		}

		MathUtil.randomseed(155);
		for (let i = 0; i < runs; ++i) {
			this._assert_eq(values[i * 3], MathUtil.random());
			this._assert_eq(values[i * 3 + 1], MathUtil.randomInt([0, 5]));
			this._assert_eq(values[i * 3 + 2], MathUtil.randomInt([10, 50]));
		}
	}

	private _kSTest(runs: number, gen: () => number, evaluate: (x: number) => number) {
		let values: number[] = [];
		const certainty = 1e-4;
		this._assert_gt(runs, 35);
		for (let i = 0; i < runs; ++i) {
			values.push(gen());
		}
		values.sort((a, b) => a - b);

		let prev = 0.0;
		let d_alpha = Math.sqrt(-0.5 * Math.log(certainty / 2)) / Math.sqrt(runs);
		for (let i = 0; i < runs; ++i) {
			let sxi = 1.0 * i / runs;
			if (i < runs - 1 && values[i] === values[i + 1]) {
				prev = sxi;
				continue;
			}
			let f0xi = evaluate(values[i]);
			let doi = Math.abs(sxi - f0xi);
			let dui = Math.abs(prev - f0xi);
			this._assert_lt(doi, d_alpha, () => `For bucket ${i} with value ${values[i]} and expected ${f0xi}`);
			this._assert_lt(dui, d_alpha);
			prev = sxi;
		}
		return 1;
	}

	private _testUniformDistribution() {
		const runs = 10000;
		MathUtil.randomseed(155);
		this._kSTest(runs, () => MathUtil.random(), uniformDistributionFunction);
	}

	private _testIndependendUniform() {
		const runs = 10000;
		MathUtil.randomseed(155);
		this._kSTest(runs, () => { let first = MathUtil.random(); let snd = MathUtil.random(); return first + snd; }, twoUniformDistributionFunction);
	}

	private _testMultipleUniform() {
		const runs = 1000;
		MathUtil.randomseed(155);
		let arr: number[][] = [];

		for (let i = 0; i < 10; ++i) {
			arr.push([]);
			for (let j = 0; j < runs; ++j) {
				arr[i].push(MathUtil.random());
			}
		}

		for (let i = 0; i < 10; ++i) {
			for (let j = i + 1; j < 10; ++j) {
				let cnt = 0;
				this._kSTest(runs, () => { let first = arr[i][cnt]; let snd = arr[j][cnt]; cnt++; return first + snd; }, twoUniformDistributionFunction);
			}
		}
	}

	private _testDifferentSeed() {
		const runs = 10000;
		MathUtil.randomseed(155);

		let arr: number[][] = [];
		for (let i = 0; i < 10; ++i) {
			arr.push([]);
			MathUtil.randomseed(1556 + i);
			for (let j = 0; j < runs; ++j) {
				arr[i].push(MathUtil.random());
			}
		}

		for (let i = 0; i < 10; ++i) {
			for (let j = i + 1; j < 10; ++j) {
				let cnt = 0;
				this._kSTest(runs, () => { let first = arr[i][cnt]; let snd = arr[j][cnt]; cnt++; return first + snd; }, twoUniformDistributionFunction);
			}
		}
	}

	private _testIntegerDistribution() {
		const runs = 10000;
		MathUtil.randomseed(155);
		this._kSTest(runs, () => MathUtil.randomInt([1, 6]), integerDistribution(1, 6));
		this._kSTest(runs, () => MathUtil.randomInt([3, 6]), integerDistribution(3, 6));
		this._kSTest(runs, () => MathUtil.randomInt([3, 60]), integerDistribution(3, 60));
		this._kSTest(runs, () => MathUtil.randomInt([0, 45]), integerDistribution(0, 45));
	}

	private _testTwoDice() {
		const runs = 10000;
		MathUtil.randomseed(155);
		this._kSTest(runs, () => MathUtil.randomInt([1, 6]) + MathUtil.randomInt([1, 6]), twoDice);
	}

	private _testDifferentSeedTwoDice() {
		const runs = 10000;
		MathUtil.randomseed(155);

		let arr: number[][] = [];
		for (let i = 0; i < 10; ++i) {
			arr.push([]);
			MathUtil.randomseed(1556 + i);
			for (let j = 0; j < runs; ++j) {
				arr[i].push(MathUtil.randomInt([1, 6]));
			}
		}

		for (let i = 0; i < 10; ++i) {
			for (let j = i + 1; j < 10; ++j) {
				let cnt = 0;
				this._kSTest(runs, () => { let first = arr[i][cnt]; let snd = arr[j][cnt]; cnt++; return first + snd; }, twoDice);
			}
		}
	}
}
export let testClass = BaseMathUtil;
