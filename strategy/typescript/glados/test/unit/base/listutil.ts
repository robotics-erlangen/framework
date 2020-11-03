import * as ListUtil from "base/listutil";

import { UnitTest } from "glados/test/unit/unittest";
export class BaseListUtil extends UnitTest {
	constructor() {
		super();
		this.addTest("testMax", this.testMax);
		this.addTest("testMin", this.testMin);
		this.addTest("testSome", this.testSome);
		this.addTest("testPartition", this.testPartition);
	}

	private testMin() {
		let array = [1,0,4,5,7,6,3,3,9];
		this.assert_equal(ListUtil.min(array, (x) => x)[0], 0);
		let [result, value] = ListUtil.min(array, (x) => 10 - x);
		this.assert_equal(result, 9);
		this.assert_equal(value, 1);
	}

	private testMax() {
		let array = [1,0,4,5,7,6,3,3,9];
		this.assert_equal(ListUtil.max(array, (x) => x)[0], 9);
		let [result, value] = ListUtil.max(array, (x) => 10 - x);
		this.assert_equal(result, 0);
		this.assert_equal(value, 10);
	}

	private testSome() {
		let array = [1,0,4,5,7,6,3,3,9];
		this.assert_true(ListUtil.some(array, (x) => x % 2 === 0));
		this.assert_false(ListUtil.some(array, (x) => x === 2));
		this.assert_true(ListUtil.some(array, (x) => x === 7));
	}

	private testPartition() {
		let array = [1,0,3,2,4,7,6,9];
		let [accept, reject] = ListUtil.partition(array, (x) => x % 2 === 0);
		this.assert_true(ListUtil.some(accept, (x) => x === 0));
		this.assert_true(ListUtil.some(accept, (x) => x === 2));
		this.assert_true(ListUtil.some(accept, (x) => x === 4));
		this.assert_true(ListUtil.some(accept, (x) => x === 6));
		this.assert_equal(accept.length, 4);
		this.assert_true(ListUtil.some(reject, (x) => x === 1));
		this.assert_true(ListUtil.some(reject, (x) => x === 3));
		this.assert_true(ListUtil.some(reject, (x) => x === 7));
		this.assert_true(ListUtil.some(reject, (x) => x === 9));
		this.assert_equal(reject.length, 4);
	}
}
export let testClass = BaseListUtil;
