import * as Types from "base/types";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseTypes extends UnitTest {
	public constructor() {
		super();
		this._addTest("parameterizeClass", this._testParameterizeClass);
	}

	private _testParameterizeClass() {
		/* Check whether parameterizeClass propagates the class name */
		class SomeWeirdName {
			public constructor(_first: number, _second: number) {
				/* empty */
			}
		}

		const hasNameTest = Types.parameterizeClass(SomeWeirdName, 1);
		this._assert_eq(SomeWeirdName.name, hasNameTest.name);
		this._assert_eq(new SomeWeirdName(420, 42).constructor.name, new hasNameTest(42).constructor.name);

	}
}
export let testClass = BaseTypes;
