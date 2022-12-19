import * as Cache from "base/cache";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseCache extends UnitTest {
	constructor() {
		super();
		this.addTest("different arguments", this.testDifferentArguments);
		this.addTest("undefined parameters", this.testUndefinedParameters);
		this.addTest("parameters", this.testParameters);
		this.addTest("side effects", this.testSideEffects);
		this.addTest("heavy", this.testHeavy);
		this.addTest("forever", this.testForever);
		this.addTest("function name", this.testFunctionName);
	}

	private testFunctionName() {
		function bar() {
			return 4;
		}
		function foo() {
			return 5;
		}
		let cachedBar = Cache.forFrame(bar);
		let cachedFoo = Cache.forFrame(foo);

		this.assert_equal(bar.name, cachedBar.name);
		this.assert_equal(foo.name, cachedFoo.name);
	}

	private testDifferentArguments() {
		function foo(a: number, b: number, c: number) {
			return a * (b + c);
		}
		let cached = Cache.forFrame(foo);

		let a = cached(1, 2, 3);
		let b = cached(2, 3, 4);
		this.assert_not_equal(a, b);
	}

	private testUndefinedParameters() {
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
		this.assert_equal(a, 4);
		this.assert_equal(b, 4);
		this.assert_equal(c, 4);
		this.assert_equal(d, 4);
	}

	private testParameters() {
		function echo(...args: any[]) {
			return args;
		}
		let cached: any = Cache.forFrame(echo);

		let a = cached();
		let b = cached("bla");
		let c = cached(undefined, 7);
		let d = cached(undefined, undefined, undefined, 5);
		this.assert_deep_equal(a, []);
		this.assert_deep_equal(b, ["bla"]);
		this.assert_deep_equal(c, [undefined, 7]);
		this.assert_deep_equal(d, [undefined, undefined, undefined, 5]);
	}

	private testSideEffects() {
		let side = 0;
		function sideEffect() {
			side = side + 1;
		}
		let cached = Cache.forFrame(sideEffect);

		cached();
		let before = side;
		cached();
		let after = side;
		this.assert_equal(before, after);

		Cache.resetFrame();
		cached();
		let afterReset = side;
		this.assert_equal(after + 1, afterReset);
	}

	private testHeavy() {
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
		this.assert_true(true);
	}

	private testForever() {
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
		this.assert_equal(before + 1, mid);
		this.assert_equal(mid, after);

		Cache.resetFrame();
		cached();
		let afterReset = side;
		this.assert_equal(after, afterReset);
	}
}
export let testClass = BaseCache;
