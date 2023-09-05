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

		this.assert_eq(bar.name, cachedBar.name);
		this.assert_eq(foo.name, cachedFoo.name);
	}

	private testDifferentArguments() {
		function foo(a: number, b: number, c: number) {
			return a * (b + c);
		}
		let cached = Cache.forFrame(foo);

		let a = cached(1, 2, 3);
		let b = cached(2, 3, 4);
		this.assert_ne(a, b);
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
		this.assert_eq(a, 4);
		this.assert_eq(b, 4);
		this.assert_eq(c, 4);
		this.assert_eq(d, 4);
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
		this.assert_deep_eq(a, []);
		this.assert_deep_eq(b, ["bla"]);
		this.assert_deep_eq(c, [undefined, 7]);
		this.assert_deep_eq(d, [undefined, undefined, undefined, 5]);
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
		this.assert_eq(before, after);

		Cache.resetFrame();
		cached();
		let afterReset = side;
		this.assert_eq(after + 1, afterReset);
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
		this.assert_eq(before + 1, mid);
		this.assert_eq(mid, after);

		Cache.resetFrame();
		cached();
		let afterReset = side;
		this.assert_eq(after, afterReset);
	}
}
export let testClass = BaseCache;
