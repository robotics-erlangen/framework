import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { UnitTest } from "glados/test/unit/unittest";

export class GladosUnitTest extends UnitTest {
	public constructor() {
		super();
		this._addTest("assertionsNoFail", this._testAssertionsNoFail);
		this._addTest("assertionsFail", this._testAssertionsFail);
		this._addSituationTest("_testSituationTest", this._testSituationTest,
			[["glados/test/unit/glados/unittest-situations/s1", 1], ["glados/test/unit/glados/unittest-situations/s2", 2]]);
		this._addSituationTest("situationtest robot eq.", this._testSituationRobotEquality,
			[["glados/test/unit/glados/unittest-situations/s1", World.FriendlyRobots[0]]]);
	}

	private _testSituationTest(situation: number) {
		if (situation === 1) {
			this._assert_eq(World.FriendlyRobots.length, 2);
			this._assert_eq(World.OpponentRobots.length, 5);
			this._assert_eq(World.Geometry.FieldHeight, 17);
			this._assert_eq(World.Geometry.FieldWidth, 11);
			this._assert_eq(World.TeamIsBlue, false);
			this._assert_eq(World.Ball.pos.x, 1);
			this._assert_eq(World.Ball.pos.y, 2);
			this._assert_eq(World.RefereeState, "Stop");
		} else if (situation === 2) {
			this._assert_eq(World.FriendlyRobots.length, 1);
			this._assert_eq(World.OpponentRobots.length, 1);
			this._assert_eq(World.Geometry.FieldHeight, 5);
			this._assert_eq(World.Geometry.FieldWidth, 3);
			this._assert_eq(World.TeamIsBlue, true);
			this._assert_eq(World.Ball.pos.x, -2); // negated due to different coordinate system
			this._assert_eq(World.Ball.pos.y, -1);
			this._assert_eq(World.RefereeState, "Halt");
		} else {
			throw new Error(`Unknown test case number ${situation}`);
		}
	}

	private _testSituationRobotEquality(robot: FriendlyRobot) {
		this._assert_eq(robot, World.FriendlyRobotsById[robot.id]);
	}

	private _testAssertionsNoFail() {
		this._assert_eq(1, 1);
		this._assert_eq("test", "test");
		this._assert_eq(false, false);

		this._assert_ne(1, 2);
		this._assert_ne("1", 1);
		this._assert_ne(undefined, false);
		this._assert_ne(0, false);
		this._assert_ne(new Vector(0, 0), new Vector(0, 0));
		this._assert_ne([], []);

		this._assert_deep_eq(1, 1);
		this._assert_deep_eq("test", "test");
		this._assert_deep_eq(false, false);
		this._assert_deep_eq([], []);
		this._assert_deep_eq([1, 2, 3], [1, 2, 3]);
		this._assert_deep_eq({ a: 1, b: 2 }, { a: 1, b: 2 });
		this._assert_deep_eq({ a: 1, b: 2 }, { b: 2, a: 1 });
		this._assert_deep_eq(new Vector(0, 0), new Vector(0, 0));

		this._assert_vector_eq(new Vector(0, 0), new Vector(0, 0));

		this._assert_vector_eq_eps(new Vector(0, 0), new Vector(0, 0.5), 0.5);
		this._assert_vector_eq_eps(new Vector(0, 0), new Vector(0, 0.25), 0.5);
		this._assert_vector_eq_eps(new Vector(0, Math.sin(Math.PI / 6)), new Vector(0, 0.5), 1e-12);

		this._assert_vector_ne(new Vector(1, 0), new Vector(0, 0));

		this._assert_false(false);

		this._assert_falsy(false);
		this._assert_falsy(0);
		this._assert_falsy("");

		this._assert_true(true);

		this._assert_truthy(true);
		this._assert_truthy(1);
		this._assert_truthy(new Vector(0, 0));

		this._assert_not_undefined(0);
		this._assert_not_undefined("undefined");
		this._assert_not_undefined(new Vector(0, 0));
		this._assert_not_undefined(false);

		this._assert_undefined(undefined);

		this._assert_error(() => { throw new Error("should fail"); });

		this._assert_le(1, 2);
		this._assert_le(1, 1);

		this._assert_eq_eps(1, 1.01, 0.1);
		this._assert_eq_eps(1, 0.99, 0.1);
		this._assert_eq_eps(0, 0, 0);

		this._assert_gt(2, 1);

		this._assert_lt(1, 2);

		this._assert_not_nan(1);

		this._assert_nan(NaN);
	}

	private _testAssertionsFail() {
		this._assert_error(() => { this._assert_eq(1, 2); });
		this._assert_error(() => { this._assert_eq("1", 1); });
		this._assert_error(() => { this._assert_eq(undefined, false); });
		this._assert_error(() => { this._assert_eq(0, false); });
		this._assert_error(() => { this._assert_eq(new Vector(0, 0), new Vector(0, 0)); });
		this._assert_error(() => { this._assert_eq([], []); });

		this._assert_error(() => { this._assert_ne(1, 1); });
		this._assert_error(() => { this._assert_ne("test", "test"); });
		this._assert_error(() => { this._assert_ne(false, false); });

		this._assert_error(() => { this._assert_deep_eq(1, 2); });
		this._assert_error(() => { this._assert_deep_eq("1", 1); });
		this._assert_error(() => { this._assert_deep_eq(undefined, false); });
		this._assert_error(() => { this._assert_deep_eq(0, false); });
		this._assert_error(() => { this._assert_eq([1, 2, 3], [1, 2]); });
		this._assert_error(() => { this._assert_eq([1, 2], [1, 2, 3]); });
		this._assert_error(() => { this._assert_eq({ a: 1, b: 2 }, { a: 1, b: 511 }); });
		this._assert_error(() => { this._assert_eq({ a: 1, b: 511 }, { a: 1, b: 2 }); });
		this._assert_error(() => { this._assert_eq(new Vector(0, 0), new Vector(0, 1)); });

		this._assert_error(() => { this._assert_vector_eq(new Vector(0, 0), new Vector(1, 0)); });

		this._assert_error(() => { this._assert_vector_ne(new Vector(0, 0), new Vector(0, 0)); });

		this._assert_error(() => { this._assert_vector_eq_eps(new Vector(0, 0), new Vector(0, 0.5), 0.4); });
		this._assert_error(() => { this._assert_vector_eq_eps(new Vector(0, 0), new Vector(0.25, 0.25), 0.3); });
		this._assert_error(() => { this._assert_vector_eq_eps(new Vector(0, 0), new Vector(1, 0.5), 0.5); });

		this._assert_error(() => { this._assert_false(true); });
		this._assert_error(() => { this._assert_false(0); });
		this._assert_error(() => { this._assert_false(undefined); });
		this._assert_error(() => { this._assert_false(""); });
		this._assert_error(() => { this._assert_false("false"); });

		this._assert_error(() => { this._assert_falsy(true); });
		this._assert_error(() => { this._assert_falsy("test"); });
		this._assert_error(() => { this._assert_falsy([1]); });

		this._assert_error(() => { this._assert_true(false); });
		this._assert_error(() => { this._assert_true([1, 2]); });
		this._assert_error(() => { this._assert_true(new Vector(0, 0)); });
		this._assert_error(() => { this._assert_true("test"); });

		this._assert_error(() => { this._assert_truthy(false); });
		this._assert_error(() => { this._assert_truthy(0); });
		this._assert_error(() => { this._assert_truthy(""); });

		this._assert_error(() => { this._assert_not_undefined(undefined); });

		this._assert_error(() => { this._assert_undefined(0); });
		this._assert_error(() => { this._assert_undefined(false); });
		this._assert_error(() => { this._assert_undefined(true); });
		this._assert_error(() => { this._assert_undefined("test"); });
		this._assert_error(() => { this._assert_undefined([1, 2, 3]); });

		this._assert_error(() => { this._assert_error(() => { let a = 3; }); });

		this._assert_error(() => { this._assert_le(3, 2); });

		this._assert_error(() => { this._assert_eq_eps(1, 2, 0.1); });
		this._assert_error(() => { this._assert_eq_eps(NaN, 0, 0.1); });

		this._assert_error(() => { this._assert_gt(1, 1); });
		this._assert_error(() => { this._assert_gt(1, 2); });

		this._assert_error(() => { this._assert_lt(1, 1); });
		this._assert_error(() => { this._assert_lt(2, 1); });

		this._assert_error(() => { this._assert_not_nan(NaN); });

		this._assert_error(() => { this._assert_nan(2); });
	}
}
export let testClass = GladosUnitTest;
