import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";
import { assignRobots } from "glados/util/moveshelper";

export class MovesHelper extends UnitTest {
	constructor() {
		super();
		this.addTest("testSquare", this.testAssignRobotsForSquare);
		this.addTest("testParallel", this.testAssignRobotsForParallelogram);
		this.addTest("testSameDistance", this.testAssignRobotsSameDistance);
		this.addTest("testCrossing", this.testAssignRobotsNoCrossing);
	}
	private testAssignRobotsForSquare() {
		let robots = [{ pos: new Vector(1, 1) }, { pos: new Vector(-1, 1) }];
		let positions = [new Vector(1, -1), new Vector(-1, -1)];
		let assignments = assignRobots(robots, positions);
		this.assert_deep_equal(assignments, [0, 1]);
	}
	private testAssignRobotsForParallelogram() {
		let robots = [{ pos: new Vector(0, 1) }, { pos: new Vector(-1, 1) }];
		let positions = [new Vector(0, -1), new Vector(1, -1)];
		let assignments = assignRobots(robots, positions);
		this.assert_deep_equal(assignments, [1, 0]);
	}
	private testAssignRobotsSameDistance() {
		let robots = [{ pos: new Vector(0, 0) }, { pos: new Vector(0, 2) }];
		let positions = [new Vector(0, -1), new Vector(0, 1)];
		let assignments = assignRobots(robots, positions);
		this.assert_deep_equal(assignments, [0, 1]);
	}
	private testAssignRobotsNoCrossing() {
		// check if someone is using distanceToSq instead of distanceTo
		// this order of points also checks if the assignment is in the correct order (position -> robot vs robot -> position)
		let robots = [{ pos: new Vector(0.45, 2.4) }, { pos: new Vector(0.45, 2.06) }, { pos: new Vector(0.65, 0.75) }];
		let positions = [new Vector(2, -2), new Vector(4, -2), new Vector(3, -2)];
		let assignments = assignRobots(robots, positions);
		this.assert_deep_equal(assignments, [2, 0, 1]);
	}

}
export let testClass = MovesHelper;
