import * as Types from "base/types";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseTypes extends UnitTest {
	constructor() {
		super();
		this.addTest("parameterizeClass", this.testParameterizeClass);
	}

	private testParameterizeClass() {
		/* Check whether parameterizeClass propagates the class name */
		class SomeWeirdName {
			constructor(_first: number, _second: number) {
				/* empty */
			}
		}

		const hasNameTest = Types.parameterizeClass(SomeWeirdName, 1);
		this.assert_equal(SomeWeirdName.name, hasNameTest.name);
		this.assert_equal(new SomeWeirdName(420, 42).constructor.name, new hasNameTest(42).constructor.name);

	}
}
export let testClass = BaseTypes;
