import * as Entrypoints from "base/entrypoints";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseEntrypoints extends UnitTest {
	constructor() {
		super();
		this.addTest("wrapper", this.testWrapper);
		this.addTest("duplicates", this.testDuplicates);
	}

	private static tmp() {
		return false;
	}

	private static wrapper_const(func: Function) {
		return func;
	}

	private static wrapper_other(_func: any) {
		return BaseEntrypoints.wrapper_other;
	}

	private testWrapper() {
		let name = "test";
		Entrypoints.add(name, BaseEntrypoints.tmp);

		let eps = Entrypoints.get(BaseEntrypoints.wrapper_const);
		this.assert_not_undefined(eps[name]);
		this.assert_equal(eps[name], BaseEntrypoints.tmp);

		let eps2 = Entrypoints.get(BaseEntrypoints.wrapper_other);
		this.assert_equal(eps2[name], BaseEntrypoints.wrapper_other);
	}

	private testDuplicates() {
		Entrypoints.add("test2", BaseEntrypoints.tmp);
		this.assert_error(function() { Entrypoints.add("test", BaseEntrypoints.tmp); });
	}
}
export let testClass = BaseEntrypoints;
