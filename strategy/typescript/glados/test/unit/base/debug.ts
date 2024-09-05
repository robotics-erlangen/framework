import * as debug from "base/debug";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseDebug extends UnitTest {
	public constructor() {
		super();
		this._addTest("wrap", this._testWrap);
	}

	private _testWrap() {
		// make sure wrap copies members
		const one: any = () => {};
		one.member = 42;
		const oneWrapped = debug.wrap("unittest", one);
		this._assert_eq(one.member, oneWrapped.member);

		// make sure wrap respects the prototype
		// who changes the prototype of a function anyways?
		const two = () => {};
		Object.setPrototypeOf(two, { someField: 42 });
		const twoWrapped = debug.wrap("unittest", two);
		this._assert_eq(Object.getPrototypeOf(two), Object.getPrototypeOf(twoWrapped));

		/*
		 * Make sure the wrapped function respects the `this` given by context
		 *
		 * To check if the bound this is correct, we have to be inside the
		 * function and. Thus, we make the assertion there and just call the
		 * function.
		 */
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const testInstance = this;

		const three: { [name: string]: () => void } = {
			unwrapped: function() {
				testInstance._assert_eq(this, three);
			},
		};
		three.wrapped = debug.wrap("unittest", three.unwrapped);
		three.unwrapped();
		three.wrapped();

		/*
		 * `this` should remain even when Function.prototype.bind is used.
		 *
		 * Note that this is done using a normal (non-arrow) function because
		 * binding `this` is not possible with arrow functions.
		 */
		const bindTarget = {};
		const boundFunction = (function(this: any) {
			testInstance._assert_eq(this, bindTarget);
		}).bind(bindTarget);
		const wrappedBoundFunction = debug.wrap("unittest", boundFunction);
		boundFunction();
		wrappedBoundFunction();
	}
}

export let testClass = BaseDebug;
