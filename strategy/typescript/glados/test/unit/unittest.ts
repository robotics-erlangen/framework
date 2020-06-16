import { pcall, tryCatchThen } from "base/trycatch";
import { Vector } from "base/vector";

export class UnitTest {
	private tests: {[name: string]: Function} = {};

	public static getOverlays(): {[moduleName: string]: any} {
		return {};
	}

	// returns the number of failed test cases
	public runTests(log: Function): number {
		let failedCounter = 0;
		log(this.constructor.name + ":");
		for (let [name, test] of Object.entries(this.tests)) {
			let hasFailed = false;
			const timeBefore = amun.getCurrentTime();
			if (pcall(() => test.call(this))) {
				hasFailed = true;
				failedCounter += 1;
			}
			let status = hasFailed ? "<font color=\"red\">fail" : "<font color=\"darkgreen\">success";
			// the amun module is not initialized here, so the time is a bigint
			log(`&nbsp;&nbsp;${name} ${status} (${String(Number(amun.getCurrentTime() - timeBefore) * 1E-6).slice(0, 5)} ms) </font>`);
		}
		return failedCounter;
	}

	protected addTest(name: string, test: Function): void {
		this.tests[name] = test;
	}

	protected assert_equal(a: any, b: any) {
		if (a !== b) {
			throw new Error(`Assert failed: '${a}' is not equal to '${b}'`);
		}
	}

	protected assert_not_equal(a: any, b: any) {
		if (a === b) {
			throw new Error(`Assert failed: both values are '${a}'`);
		}
	}

	static deepEquals(a: any, b: any): boolean {
		if (a === b) {
			return true;
		}
		if (a instanceof Object && b instanceof Object) {
			let allKeys: {[index: string]: boolean} = {};
			for (let key of Object.keys(a)) {
				allKeys[key] = true;
			}
			for (let key of Object.keys(b)) {
				allKeys[key] = true;
			}
			for (let key of Object.keys(allKeys)) {
				if (!(key in a) || !(key in b)) {
					return false;
				}
				if (!UnitTest.deepEquals(a[key], b[key])) {
					return false;
				}
			}
			return true;
		}
		return false;
	}

	protected assert_deep_equal(a: any, b: any) {
		if (!UnitTest.deepEquals(a, b)) {
			throw new Error(`Assert failed: '${a._toString()}' is not equal to '${b._toString()}'`);
		}
	}

	protected assert_vector_equal(a: Vector | undefined, b: Vector | undefined) {
		if (a === undefined || b === undefined || !a.equals(b)) {
			throw new Error(`Assert failed: '${a ? a._toString() : a}' is not equal to '${b ? b._toString() : b}'`);
		}
	}

	protected assert_vector_not_equal(a: Vector | undefined, b: Vector | undefined) {
		if (a === undefined || b === undefined || a.equals(b)) {
			throw new Error(`Assert failed: '${a ? a._toString() : a}' is equal to '${b ? b._toString() : b}'`);
		}
	}

	protected assert_vector_equal_eps(a: Vector | undefined, b: Vector | undefined, eps: number) {
		this.assert_not_undefined(a);
		this.assert_not_undefined(b);
		a = a!;
		b = b!;
		if (isNaN(a.distanceToSq(b)) || a.distanceToSq(b) > eps * eps) {
			throw new Error(`Assert failes: '${a ? a._toString() : a}' is not equal to '${b ? b._toString() : b}'. Distance: '${a.distanceTo(b)}' > '${eps}'`);
		}
	}

	protected assert_false(a: any) {
		if (a !== false) {
			throw new Error(`Assert failed: '${a}' is not false`);
		}
	}

	protected assert_falsy(a: any) {
		if (a) {
			throw new Error(`Assert failed: '${a}' is not falsy`);
		}
	}

	protected assert_true(a: any) {
		if (a !== true) {
			throw new Error(`Assert failed: '${a}' is not true`);
		}
	}

	protected assert_truthy(a: any) {
		if (!a) {
			throw new Error(`Assert failed: '${a}' is not truthy`);
		}
	}

	protected assert_not_undefined(a: any) {
		if (a === undefined) {
			throw new Error(`Assert failed: '${a}' should not be undefined`);
		}
	}

	protected assert_undefined(a: any) {
		if (a !== undefined) {
			throw new Error(`Assert failed: '${a}' should be undefined`);
		}
	}

	protected assert_error(a: () => void) {
		tryCatchThen(a, () => {}, () => {throw new Error("Assert failed: function did not produce error");});
	}

	protected assert_lte(a: number, b: number) {
		this.assert_not_nan(a);
		this.assert_not_nan(b);
		if (a > b) {
			throw new Error(`Assert failed: ${a} is not less than or equal to ${b}`);
		}
	}

	protected assert_equal_eps(a: number, b: number, eps: number) {
		this.assert_not_nan(a);
		this.assert_not_nan(b);
		if (Math.abs(a - b) > eps) {
			throw new Error(`Assert failed: diff between ${a} and ${b} (${Math.abs(a - b)} is greater than ${eps})`);
		}
	}

	protected assert_greater_than(a: number, b: number) {
		this.assert_not_nan(a);
		this.assert_not_nan(b);
		if (a <= b) {
			throw new Error(`Assert failed: ${a} is not greater than ${b}`);
		}
	}

	protected assert_less_than(a: number, b: number, lazyString?: () => string) {
		this.assert_not_nan(a);
		this.assert_not_nan(b);
		if (a >= b) {
			lazyString = lazyString || (() => "");
			throw new Error(`Assert failed: ${a} is not less than ${b}: ${lazyString()}`);
		}
	}

	protected assert_not_nan(a: number) {
		if (isNaN(a)) {
			throw new Error(`Assert failed: ${a} is NaN`);
		}
	}

	protected assert_nan(a: number) {
		if (!isNaN(a)) {
			throw new Error(`Assert failed: ${a} is not NaN`);
		}
	}
}
