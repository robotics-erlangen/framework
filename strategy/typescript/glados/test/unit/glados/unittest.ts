import { Vector } from "base/vector";
import { UnitTest } from "glados/test/unit/unittest";

export class GladosUnitTest extends UnitTest {
	constructor() {
		super();
		this.addTest("assertionsNoFail", this.testAssertionsNoFail);
		this.addTest("assertionsFail", this.testAssertionsFail);
	}

	private testAssertionsNoFail() {
		this.assert_equal(1, 1);
		this.assert_equal("test", "test");
		this.assert_equal(false, false);

		this.assert_not_equal(1, 2);
		this.assert_not_equal("1", 1);
		this.assert_not_equal(undefined, false);
		this.assert_not_equal(0, false);
		this.assert_not_equal(new Vector(0, 0), new Vector(0, 0));
		this.assert_not_equal([], []);

		this.assert_deep_equal(1, 1);
		this.assert_deep_equal("test", "test");
		this.assert_deep_equal(false, false);
		this.assert_deep_equal([], []);
		this.assert_deep_equal([1, 2, 3], [1, 2, 3]);
		this.assert_deep_equal({a: 1, b: 2}, {a: 1, b: 2});
		this.assert_deep_equal({a: 1, b: 2}, {b: 2, a: 1});
		this.assert_deep_equal(new Vector(0, 0), new Vector(0, 0));

		this.assert_vector_equal(new Vector(0, 0), new Vector(0, 0));

		this.assert_vector_not_equal(new Vector(1, 0), new Vector(0, 0));

		this.assert_false(false);

		this.assert_falsy(false);
		this.assert_falsy(0);
		this.assert_falsy("");

		this.assert_true(true);

		this.assert_truthy(true);
		this.assert_truthy(1);
		this.assert_truthy(new Vector(0, 0));

		this.assert_not_undefined(0);
		this.assert_not_undefined("undefined");
		this.assert_not_undefined(new Vector(0, 0));
		this.assert_not_undefined(false);

		this.assert_undefined(undefined);

		this.assert_error(() => { throw new Error("should fail"); });

		this.assert_lte(1, 2);
		this.assert_lte(1, 1);

		this.assert_equal_eps(1, 1.01, 0.1);
		this.assert_equal_eps(1, 0.99, 0.1);
		this.assert_equal_eps(0, 0, 0);

		this.assert_greater_than(2, 1);

		this.assert_less_than(1, 2);
	}

	private testAssertionsFail() {
		this.assert_error(() => { this.assert_equal(1, 2); });
		this.assert_error(() => { this.assert_equal("1", 1); });
		this.assert_error(() => { this.assert_equal(undefined, false); });
		this.assert_error(() => { this.assert_equal(0, false); });
		this.assert_error(() => { this.assert_equal(new Vector(0, 0), new Vector(0, 0)); });
		this.assert_error(() => { this.assert_equal([], []); });

		this.assert_error(() => { this.assert_not_equal(1, 1); });
		this.assert_error(() => { this.assert_not_equal("test", "test"); });
		this.assert_error(() => { this.assert_not_equal(false, false); });

		this.assert_error(() => { this.assert_deep_equal(1, 2); });
		this.assert_error(() => { this.assert_deep_equal("1", 1); });
		this.assert_error(() => { this.assert_deep_equal(undefined, false); });
		this.assert_error(() => { this.assert_deep_equal(0, false); });
		this.assert_error(() => { this.assert_equal([1, 2, 3], [1, 2]); });
		this.assert_error(() => { this.assert_equal([1, 2], [1, 2, 3]); });
		this.assert_error(() => { this.assert_equal({a: 1, b: 2}, {a: 1, b: 511}); });
		this.assert_error(() => { this.assert_equal({a: 1, b: 511}, {a: 1, b: 2}); });
		this.assert_error(() => { this.assert_equal(new Vector(0, 0), new Vector(0, 1)); });

		this.assert_error(() => { this.assert_vector_equal(undefined, undefined); });
		this.assert_error(() => { this.assert_vector_equal(new Vector(0, 0), new Vector(1, 0)); });
		this.assert_error(() => { this.assert_vector_equal(undefined, new Vector(0, 0)); });

		this.assert_error(() => { this.assert_vector_not_equal(new Vector(0, 0), new Vector(0, 0)); });

		this.assert_error(() => { this.assert_false(true); });
		this.assert_error(() => { this.assert_false(0); });
		this.assert_error(() => { this.assert_false(undefined); });
		this.assert_error(() => { this.assert_false(""); });
		this.assert_error(() => { this.assert_false("false"); });

		this.assert_error(() => { this.assert_falsy(true); });
		this.assert_error(() => { this.assert_falsy("test"); });
		this.assert_error(() => { this.assert_falsy([1]); });

		this.assert_error(() => { this.assert_true(false); });
		this.assert_error(() => { this.assert_true([1, 2]); });
		this.assert_error(() => { this.assert_true(new Vector(0, 0)); });
		this.assert_error(() => { this.assert_true("test"); });

		this.assert_error(() => { this.assert_truthy(false); });
		this.assert_error(() => { this.assert_truthy(0); });
		this.assert_error(() => { this.assert_truthy(""); });

		this.assert_error(() => { this.assert_not_undefined(undefined); });

		this.assert_error(() => { this.assert_undefined(0); });
		this.assert_error(() => { this.assert_undefined(false); });
		this.assert_error(() => { this.assert_undefined(true); });
		this.assert_error(() => { this.assert_undefined("test"); });
		this.assert_error(() => { this.assert_undefined([1, 2, 3]); });

		this.assert_error(() => { this.assert_error(() => { let a = 3; }); });

		this.assert_error(() => { this.assert_lte(3, 2); });

		this.assert_error(() => { this.assert_equal_eps(1, 2, 0.1); });

		this.assert_error(() => { this.assert_greater_than(1, 1); });
		this.assert_error(() => { this.assert_greater_than(1, 2); });

		this.assert_error(() => { this.assert_less_than(1, 1); });
		this.assert_error(() => { this.assert_less_than(2, 1); });
	}
}
export let testClass = GladosUnitTest;
