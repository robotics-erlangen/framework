import * as TryCatch from "base/trycatch";

import { UnitTest } from "glados/test/unit/unittest";

function fail(): void {
	throw new Error("Should fail");
}

let cond = true;

function falsify(): void {
	cond = false;
}

function combine(a: () => void, b: () => void) {
	return () => {
		a();
		b();
	};
}

function ignore(): void {
}

export class BaseTryCatch extends UnitTest {
	constructor() {
		super();
		this.addTest("pcall", this.testPCall);
		this.addTest("tryCatch", this.testTryCatch);
		this.addTest("tryCatchThen", this.testTryCatchThen);
	}


	private testPCall() {
		// check that function will be executed
		cond = true;
		this.assert_false(TryCatch.pcall(falsify));
		this.assert_false(cond);

		// As any caught error will be displayed in the logwidged by c++, we do not continue testing here.
		// Pcall is already beeing used in the testframework quite a bit, and therefore its features should be correct.
	}

	private testTryCatch() {
		// check that try will be executed
		cond = true;
		TryCatch.tryCatch(falsify, ignore);
		this.assert_false(cond);

		// check that try execution will not continue after an error
		cond = true;
		TryCatch.tryCatch(combine(fail, falsify), ignore);
		this.assert_true(cond);

		// check that try execution will happen until the error is encountered
		cond = true;
		TryCatch.tryCatch(combine(falsify, fail), ignore);
		this.assert_false(cond);

		// check that catch will not be executed if no error occured
		cond = true;
		TryCatch.tryCatch(ignore, falsify);
		this.assert_true(cond);

		// check that catch will be executed if an error occured
		cond = true;
		TryCatch.tryCatch(fail, falsify);
		this.assert_false(cond);

		// check that throwing in catch works
		this.assert_error(() => TryCatch.tryCatch(fail, fail));

		// check that the error object will arrive correctly
		let o: Object = new Object();
		TryCatch.tryCatch(() => { throw o; }, (e: any) => {this.assert_equal(e, o);});
		this.assert_error(() => TryCatch.tryCatch(fail, (e: any) => {this.assert_equal(e, o);}));

		// check that the error object will arrive correctly from catch
		TryCatch.tryCatch(() => { TryCatch.tryCatch(fail, () => { throw o;});}, (e: any) => { this.assert_equal(e, o);});
		this.assert_error(() => { TryCatch.tryCatch(() => { TryCatch.tryCatch(fail, () => { throw o;});}, (e: any) => { this.assert_equal(e, new Object());});});
	}

	private testTryCatchThen() {
		// check that try will be executed
		cond = true;
		TryCatch.tryCatchThen(falsify, ignore, ignore);
		this.assert_false(cond);

		// check that catch will not be executed if no error occured
		cond = true;
		TryCatch.tryCatchThen(ignore, falsify, ignore);
		this.assert_true(cond);

		// check that then will be executed if no error occured
		cond = true;
		TryCatch.tryCatchThen(ignore, ignore, falsify);
		this.assert_false(cond);

		// check that catch will be executed if an error occured
		cond = true;
		TryCatch.tryCatchThen(fail, falsify, ignore);
		this.assert_false(cond);

		// check that then will not be executed if an error occured
		cond = true;
		TryCatch.tryCatchThen(fail, ignore, falsify);
		this.assert_true(cond);

		// check that throwing in catch works
		this.assert_error(() => TryCatch.tryCatchThen(fail, fail, ignore));

		// check that throwing in then works
		this.assert_error(() => TryCatch.tryCatchThen(ignore, ignore, fail));

		// check that the error object will arrive correctly
		let o: Object = new Object();
		TryCatch.tryCatchThen(() => { throw o; }, (e: any) => {this.assert_equal(e, o);}, ignore);
		this.assert_error(() => TryCatch.tryCatchThen(fail, (e: any) => {this.assert_equal(e, o);}, ignore));
	}
}
export let testClass = BaseTryCatch;
