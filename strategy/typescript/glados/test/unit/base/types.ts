import * as Types from "base/types";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseTypes extends UnitTest {
	public constructor() {
		super();
		this.addTest("parameterizeClass", this.testParameterizeClass);
	}

	private testParameterizeClass() {
		/* Check whether parameterizeClass propagates the class name */
		class SomeWeirdName {
			public constructor(_first: number, _second: number) {
				/* empty */
			}
		}

		const hasNameTest = Types.parameterizeClass(SomeWeirdName, 1);
		this.assert_eq(SomeWeirdName.name, hasNameTest.name);
		this.assert_eq(new SomeWeirdName(420, 42).constructor.name, new hasNameTest(42).constructor.name);

	}
}
export let testClass = BaseTypes;
