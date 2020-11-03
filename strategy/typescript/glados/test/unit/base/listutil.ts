import * as ListUtil from "base/listutil";

import { UnitTest } from "glados/test/unit/unittest";
export class BaseListUtil extends UnitTest {
	constructor() {
		super();
		this.addTest("testMax", this.testMax);
		this.addTest("testMin", this.testMin);
		this.addTest("testSome", this.testSome);
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
}
export let testClass = BaseListUtil;
