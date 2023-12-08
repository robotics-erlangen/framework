import { FriendlyRobot } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { UnitTest } from "glados/test/unit/unittest";

export class GladosUnitTest extends UnitTest {
	public constructor() {
		super();
		this.addTest("assertionsNoFail", this.testAssertionsNoFail);
		this.addTest("assertionsFail", this.testAssertionsFail);
		this.addSituationTest("testSituationTest", this.testSituationTest,
			[["glados/test/unit/glados/unittest-situations/s1", 1], ["glados/test/unit/glados/unittest-situations/s2", 2]]);
		this.addSituationTest("situationtest robot eq.", this.testSituationRobotEquality,
			[["glados/test/unit/glados/unittest-situations/s1", World.FriendlyRobots[0]]]);
	}

	private testSituationTest(situation: number) {
		if (situation === 1) {
			this.assert_eq(World.FriendlyRobots.length, 2);
			this.assert_eq(World.OpponentRobots.length, 5);
			this.assert_eq(World.Geometry.FieldHeight, 17);
			this.assert_eq(World.Geometry.FieldWidth, 11);
			this.assert_eq(World.TeamIsBlue, false);
			this.assert_eq(World.Ball.pos.x, 1);
			this.assert_eq(World.Ball.pos.y, 2);
			this.assert_eq(World.RefereeState, "Stop");
		} else if (situation === 2) {
			this.assert_eq(World.FriendlyRobots.length, 1);
			this.assert_eq(World.OpponentRobots.length, 1);
			this.assert_eq(World.Geometry.FieldHeight, 5);
			this.assert_eq(World.Geometry.FieldWidth, 3);
			this.assert_eq(World.TeamIsBlue, true);
			this.assert_eq(World.Ball.pos.x, -2); // negated due to different coordinate system
			this.assert_eq(World.Ball.pos.y, -1);
			this.assert_eq(World.RefereeState, "Halt");
		} else {
			throw new Error(`Unknown test case number ${situation}`);
		}
	}

	private testSituationRobotEquality(robot: FriendlyRobot) {
		this.assert_eq(robot, World.FriendlyRobotsById[robot.id]);
	}

	private testAssertionsNoFail() {
		this.assert_eq(1, 1);
		this.assert_eq("test", "test");
		this.assert_eq(false, false);

		this.assert_ne(1, 2);
		this.assert_ne("1", 1);
		this.assert_ne(undefined, false);
		this.assert_ne(0, false);
		this.assert_ne(new Vector(0, 0), new Vector(0, 0));
		this.assert_ne([], []);

		this.assert_deep_eq(1, 1);
		this.assert_deep_eq("test", "test");
		this.assert_deep_eq(false, false);
		this.assert_deep_eq([], []);
		this.assert_deep_eq([1, 2, 3], [1, 2, 3]);
		this.assert_deep_eq({ a: 1, b: 2 }, { a: 1, b: 2 });
		this.assert_deep_eq({ a: 1, b: 2 }, { b: 2, a: 1 });
		this.assert_deep_eq(new Vector(0, 0), new Vector(0, 0));

		this.assert_vector_eq(new Vector(0, 0), new Vector(0, 0));

		this.assert_vector_eq_eps(new Vector(0, 0), new Vector(0, 0.5), 0.5);
		this.assert_vector_eq_eps(new Vector(0, 0), new Vector(0, 0.25), 0.5);
		this.assert_vector_eq_eps(new Vector(0, Math.sin(Math.PI / 6)), new Vector(0, 0.5), 1e-12);

		this.assert_vector_ne(new Vector(1, 0), new Vector(0, 0));

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

		this.assert_le(1, 2);
		this.assert_le(1, 1);

		this.assert_eq_eps(1, 1.01, 0.1);
		this.assert_eq_eps(1, 0.99, 0.1);
		this.assert_eq_eps(0, 0, 0);

		this.assert_gt(2, 1);

		this.assert_lt(1, 2);

		this.assert_not_nan(1);

		this.assert_nan(NaN);
	}

	private testAssertionsFail() {
		this.assert_error(() => { this.assert_eq(1, 2); });
		this.assert_error(() => { this.assert_eq("1", 1); });
		this.assert_error(() => { this.assert_eq(undefined, false); });
		this.assert_error(() => { this.assert_eq(0, false); });
		this.assert_error(() => { this.assert_eq(new Vector(0, 0), new Vector(0, 0)); });
		this.assert_error(() => { this.assert_eq([], []); });

		this.assert_error(() => { this.assert_ne(1, 1); });
		this.assert_error(() => { this.assert_ne("test", "test"); });
		this.assert_error(() => { this.assert_ne(false, false); });

		this.assert_error(() => { this.assert_deep_eq(1, 2); });
		this.assert_error(() => { this.assert_deep_eq("1", 1); });
		this.assert_error(() => { this.assert_deep_eq(undefined, false); });
		this.assert_error(() => { this.assert_deep_eq(0, false); });
		this.assert_error(() => { this.assert_eq([1, 2, 3], [1, 2]); });
		this.assert_error(() => { this.assert_eq([1, 2], [1, 2, 3]); });
		this.assert_error(() => { this.assert_eq({ a: 1, b: 2 }, { a: 1, b: 511 }); });
		this.assert_error(() => { this.assert_eq({ a: 1, b: 511 }, { a: 1, b: 2 }); });
		this.assert_error(() => { this.assert_eq(new Vector(0, 0), new Vector(0, 1)); });

		this.assert_error(() => { this.assert_vector_eq(new Vector(0, 0), new Vector(1, 0)); });

		this.assert_error(() => { this.assert_vector_ne(new Vector(0, 0), new Vector(0, 0)); });

		this.assert_error(() => { this.assert_vector_eq_eps(new Vector(0, 0), new Vector(0, 0.5), 0.4); });
		this.assert_error(() => { this.assert_vector_eq_eps(new Vector(0, 0), new Vector(0.25, 0.25), 0.3); });
		this.assert_error(() => { this.assert_vector_eq_eps(new Vector(0, 0), new Vector(1, 0.5), 0.5); });

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

		this.assert_error(() => { this.assert_le(3, 2); });

		this.assert_error(() => { this.assert_eq_eps(1, 2, 0.1); });
		this.assert_error(() => { this.assert_eq_eps(NaN, 0, 0.1); });

		this.assert_error(() => { this.assert_gt(1, 1); });
		this.assert_error(() => { this.assert_gt(1, 2); });

		this.assert_error(() => { this.assert_lt(1, 1); });
		this.assert_error(() => { this.assert_lt(2, 1); });

		this.assert_error(() => { this.assert_not_nan(NaN); });

		this.assert_error(() => { this.assert_nan(2); });
	}
}
export let testClass = GladosUnitTest;
