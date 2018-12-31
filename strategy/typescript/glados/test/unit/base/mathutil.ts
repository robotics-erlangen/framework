import * as MathUtil from "base/mathutil";

const EPS = 1E-12;

import { UnitTest } from "glados/test/unit/unittest";

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
		let array = [ 1, 2, 3, 4, 0 ];
		this.assert_equal(MathUtil.average(array), 2);
		this.assert_equal(MathUtil.average(array, 0, 5), 2);
		this.assert_equal(MathUtil.average(array, 1, 4), 3);
		this.assert_equal(MathUtil.average(array, 3, 4), 4);
	}

	private testVariance() {
		let array = [ 1, 2, 3, 4, 0 ];
		this.assert_equal(MathUtil.variance(array), 2);
		this.assert_equal(MathUtil.variance(array, 2), 2);
		this.assert_equal(MathUtil.variance(array, undefined, 0, 5), 2);
		this.assert_equal(MathUtil.variance(array, 2, 0, 5), 2);
		this.assert_equal(MathUtil.variance(array, undefined, 1, 4), 2 / 3);
		this.assert_equal(MathUtil.variance(array, 3, 1, 4), 2 / 3);
		this.assert_equal(MathUtil.variance(array, undefined, 3, 4), 0);
	}
}
export let testClass = BaseMathUtil;
