import * as ListUtil from "base/listutil";

import { UnitTest } from "glados/test/unit/unittest";
export class BaseListUtil extends UnitTest {
	constructor() {
		super();
		this.addTest("testMax", this.testMax);
		this.addTest("testMin", this.testMin);
		this.addTest("testPartition", this.testPartition);
		this.addTest("testRange", this.testRange);
	}

	private testMin() {
		let array = [1, 0, 4, 5, 7, 6, 3, 3, 9];
		this.assert_equal(ListUtil.min(array, (x) => x)[0], 0);
		let [result, value] = ListUtil.min(array, (x) => 10 - x);
		this.assert_equal(result, 9);
		this.assert_equal(value, 1);
		this.assert_equal(ListUtil.min([] as number[], (a) => a)[0], undefined);
	}

	private testMax() {
		let array = [1, 0, 4, 5, 7, 6, 3, 3, 9];
		this.assert_equal(ListUtil.max(array, (x) => x)[0], 9);
		let [result, value] = ListUtil.max(array, (x) => 10 - x);
		this.assert_equal(result, 0);
		this.assert_equal(value, 10);

		this.assert_equal(ListUtil.max([] as number[], (a) => a)[0], undefined);
	}

	private testPartition() {
		let array = [1, 0, 3, 2, 4, 7, 6, 9];
		let [accept, reject] = ListUtil.partition(array, (x) => x % 2 === 0);
		this.assert_true(accept.some((x) => x === 0));
		this.assert_true(accept.some((x) => x === 2));
		this.assert_true(accept.some((x) => x === 4));
		this.assert_true(accept.some((x) => x === 6));
		this.assert_equal(accept.length, 4);
		this.assert_true(reject.some((x) => x === 1));
		this.assert_true(reject.some((x) => x === 3));
		this.assert_true(reject.some((x) => x === 7));
		this.assert_true(reject.some((x) => x === 9));
		this.assert_equal(reject.length, 4);
	}

	private testRange() {
		this.assert_deep_equal(ListUtil.range(0, 1), [0]);
		this.assert_deep_equal(ListUtil.range(2, 4), [2, 3]);
		this.assert_deep_equal(ListUtil.range(3, 10), [3, 4, 5, 6, 7, 8, 9]);
		this.assert_deep_equal(ListUtil.range(0, 10), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
		this.assert_deep_equal(ListUtil.range(-2, 10), [-2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

		this.assert_deep_equal(ListUtil.range(0, 0), []);
		this.assert_deep_equal(ListUtil.range(-1, -1), []);
		this.assert_deep_equal(ListUtil.range(4, 4), []);
		this.assert_deep_equal(ListUtil.range(4, 2), []);
	}
}
export let testClass = BaseListUtil;
