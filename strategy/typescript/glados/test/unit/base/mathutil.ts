import * as MathUtil from "base/mathutil";

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
	constructor() {
		super();
		this.addTest("bound", this.testBound);
		this.addTest("roundTowards", this.testRoundTowards);
		this.addTest("roundUpwards", this.testRoundUpwards);
		this.addTest("round", this.testRound);
		this.addTest("solveLine", this.testSolveLin);
		this.addTest("solveSq", this.testSolveSq);
		this.addTest("sign", this.testSign);
		this.addTest("average", this.testAverage);
		this.addTest("variance", this.testVariance);
		this.addTest("RNGBounds", this.testUniformBounds);
		this.addTest("RNGSeed", this.testSeeding);
		this.addTest("RNGUniformDistribution", this.testUniformDistribution);
		this.addTest("RNGIndependendUniform", this.testIndependendUniform);
		this.addTest("RNGMultiUniform", this.testMultipleUniform);
		this.addTest("RNGMultiSeed", this.testDifferentSeed);
		this.addTest("RNGIntegerDistribution", this.testIntegerDistribution);
		this.addTest("RNGtwoDice", this.testTwoDice);
		this.addTest("RNGmultiSeedTwoDice", this.testDifferentSeedTwoDice);
	}

	private testBound() {
		this.assert_equal(MathUtil.bound(1, 2, 3), 2);
		this.assert_equal(MathUtil.bound(1, 4, 3), 3);
		this.assert_equal(MathUtil.bound(1, 0, 3), 1);
		this.assert_equal(MathUtil.bound(1, -Infinity, 3), 1);
		this.assert_equal(MathUtil.bound(1, Infinity, 3), 3);
	}

	private testRoundTowards() {
		this.assert_equal(MathUtil.roundTowards(2.5, 3, 0), 3);
		this.assert_equal(MathUtil.roundTowards(2.4, 3, 0.2), 3);
		this.assert_equal(MathUtil.roundTowards(2.399, 3, 0.2), 2);
		this.assert_equal(MathUtil.roundTowards(2.399, 3, 0.2), 2);
		this.assert_equal(MathUtil.roundTowards(2.449, 3, 0.1), 2);
		this.assert_equal(MathUtil.roundTowards(2.551, 2, 0.1), 3);
		this.assert_equal(MathUtil.roundTowards(1.49, 3, 0.1), 1);
		this.assert_equal(MathUtil.roundTowards(4.51, 3, 0.1), 5);
	}

	private testRoundUpwards() {
		this.assert_equal(MathUtil.roundUpwards(2, 0.1), 2);
		this.assert_equal(MathUtil.roundUpwards(1.5, 0), 2);
		this.assert_equal(MathUtil.roundUpwards(1.4, 0.1), 2);
		this.assert_equal(MathUtil.roundUpwards(1.39, 0.1), 1);
		this.assert_equal(MathUtil.roundUpwards(2.39, 0.1), 2);
		this.assert_equal(MathUtil.roundUpwards(-2.55, 0.1), -2);
		this.assert_equal(MathUtil.roundUpwards(-2.45, 0), -2);
		this.assert_equal(MathUtil.roundUpwards(-2.61, 0.1), -3);
	}

	private testRound() {
		this.assert_equal(MathUtil.round(2.45), 2);
		this.assert_equal(MathUtil.round(2.45, 0), 2);
		this.assert_equal(MathUtil.round(2.45, 1), 2.5);
		this.assert_equal(MathUtil.round(2.45, 2), 2.45);
		this.assert_equal(MathUtil.round(0.0001), 0);
		this.assert_equal(MathUtil.round(0.0001, 0), 0);
		this.assert_equal(MathUtil.round(0.0001, 1), 0);
		this.assert_equal(MathUtil.round(0.0001, 2), 0);
		this.assert_equal(MathUtil.round(0.0001, 3), 0);
		this.assert_equal(MathUtil.round(123, 0), 123);
		this.assert_equal(MathUtil.round(123, -1), 120);
		this.assert_equal_eps(MathUtil.round(123, -2), 100, EPS);
		this.assert_equal(MathUtil.round(2.5, 0), 3);
	}

	private testSolveLin() {
		this.assert_equal(MathUtil.solveLin(1, 2), -2);
		this.assert_equal(MathUtil.solveLin(0, 2), undefined);
		this.assert_equal(MathUtil.solveLin(2, -1), 0.5);
		this.assert_equal(MathUtil.solveLin(-2, -1), -0.5);
		this.assert_equal(MathUtil.solveLin(4, 2), -0.5);
		this.assert_equal(MathUtil.solveLin(-4, -2), -0.5);
	}

	private testSolveSq() {
		let [x1, x2] = MathUtil.solveSq(1, 0, -1);
		this.assert_equal(x1, 1);
		this.assert_equal(x2, -1);

		[x1, x2] = MathUtil.solveSq(3, -15, 18);
		this.assert_equal(x1, 2);
		this.assert_equal(x2, 3);

		// verify numeric stability
		// (x-a)(x-b) = x*x-(a+b)*x+a*b = 0
		[x1, x2] = MathUtil.solveSq(1, -1e9 - 1e-9, 1e9 * 1e-9);
		this.assert_equal(x1, 1e-9);
		this.assert_equal(x2, 1e9);

		[x1, x2] = MathUtil.solveSq(1, 0, 0);
		this.assert_equal(x1, 0);
		this.assert_equal(x2, undefined);

		[x1, x2] = MathUtil.solveSq(1, -2, 1);
		this.assert_equal(x1, 1);
		this.assert_equal(x2, undefined);

		[x1, x2] = MathUtil.solveSq(1, -2, 1);
		this.assert_equal(x1, 1);
		this.assert_equal(x2, undefined);

		[x1, x2] = MathUtil.solveSq(1, 0, 1);
		this.assert_equal(x1, undefined);
		this.assert_equal(x2, undefined);

		[x1, x2] = MathUtil.solveSq(0, 1, 2);
		this.assert_equal(x1, -2);
		this.assert_equal(x2, undefined);

		[x1, x2] = MathUtil.solveSq(0, 0, 2);
		this.assert_equal(x1, undefined);
		this.assert_equal(x2, undefined);
	}

	private testSign() {
		this.assert_equal(MathUtil.sign(0), 0);
		this.assert_equal(MathUtil.sign(-0), 0);
		this.assert_equal(MathUtil.sign(-0.01), -1);
		this.assert_equal(MathUtil.sign(0.01), 1);
		this.assert_equal(MathUtil.sign(-100), -1);
		this.assert_equal(MathUtil.sign(100), 1);
	}

	private testAverage() {
		let array = [1, 2, 3, 4, 0];
		this.assert_equal(MathUtil.average(array), 2);
		this.assert_equal(MathUtil.average(array, 0, 5), 2);
		this.assert_equal(MathUtil.average(array, 1, 4), 3);
		this.assert_equal(MathUtil.average(array, 3, 4), 4);
	}

	private testVariance() {
		let array = [1, 2, 3, 4, 0];
		this.assert_equal(MathUtil.variance(array), 2);
		this.assert_equal(MathUtil.variance(array, 2), 2);
		this.assert_equal(MathUtil.variance(array, undefined, 0, 5), 2);
		this.assert_equal(MathUtil.variance(array, 2, 0, 5), 2);
		this.assert_equal(MathUtil.variance(array, undefined, 1, 4), 2 / 3);
		this.assert_equal(MathUtil.variance(array, 3, 1, 4), 2 / 3);
		this.assert_equal(MathUtil.variance(array, undefined, 3, 4), 0);
	}

	// The following tests are a simple port of src/tests/core/rng.cpp

	private testUniformBounds() {
		MathUtil.randomseed(155);
		const runs = 50;
		for (let i = 0; i < runs; ++i) {
			let uniform = MathUtil.random();
			this.assert_lte(0, uniform);
			this.assert_less_than(uniform, 1);
		}
	}

	private testSeeding() {
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
			this.assert_equal(values[i * 3], MathUtil.random());
			this.assert_equal(values[i * 3 + 1], MathUtil.randomInt([0, 5]));
			this.assert_equal(values[i * 3 + 2], MathUtil.randomInt([10, 50]));
		}
	}

	private kSTest(runs: number, gen: () => number, evaluate: (x: number) => number) {
		let values: number[] = [];
		const certainty = 1e-4;
		this.assert_greater_than(runs, 35);
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
			this.assert_less_than(doi, d_alpha, () => `For bucket ${i} with value ${values[i]} and expected ${f0xi}`);
			this.assert_less_than(dui, d_alpha);
			prev = sxi;
		}
		return 1;
	}

	private testUniformDistribution() {
		const runs = 10000;
		MathUtil.randomseed(155);
		this.kSTest(runs, () => MathUtil.random(), uniformDistributionFunction);
	}

	private testIndependendUniform() {
		const runs = 10000;
		MathUtil.randomseed(155);
		this.kSTest(runs, () => { let first = MathUtil.random(); let snd = MathUtil.random(); return first + snd; }, twoUniformDistributionFunction);
	}

	private testMultipleUniform() {
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
				this.kSTest(runs, () => { let first = arr[i][cnt]; let snd = arr[j][cnt]; cnt++; return first + snd; }, twoUniformDistributionFunction);
			}
		}
	}

	private testDifferentSeed() {
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
				this.kSTest(runs, () => { let first = arr[i][cnt]; let snd = arr[j][cnt]; cnt++; return first + snd; }, twoUniformDistributionFunction);
			}
		}
	}

	private testIntegerDistribution() {
		const runs = 10000;
		MathUtil.randomseed(155);
		this.kSTest(runs, () => MathUtil.randomInt([1, 6]), integerDistribution(1, 6));
		this.kSTest(runs, () => MathUtil.randomInt([3, 6]), integerDistribution(3, 6));
		this.kSTest(runs, () => MathUtil.randomInt([3, 60]), integerDistribution(3, 60));
		this.kSTest(runs, () => MathUtil.randomInt([0, 45]), integerDistribution(0, 45));
	}

	private testTwoDice() {
		const runs = 10000;
		MathUtil.randomseed(155);
		this.kSTest(runs, () => MathUtil.randomInt([1, 6]) + MathUtil.randomInt([1, 6]), twoDice);
	}

	private testDifferentSeedTwoDice() {
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
				this.kSTest(runs, () => { let first = arr[i][cnt]; let snd = arr[j][cnt]; cnt++; return first + snd; }, twoDice);
			}
		}
	}
}
export let testClass = BaseMathUtil;
