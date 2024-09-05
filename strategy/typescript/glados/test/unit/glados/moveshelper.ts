import { Robot } from "base/robot";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";
import { assignRobots } from "glados/util/moveshelper";

export class MovesHelper extends UnitTest {
	public constructor() {
		super();
		this._addTest("testSquare", this._testAssignRobotsForSquare);
		this._addTest("testParallel", this._testAssignRobotsForParallelogram);
		this._addTest("testSameDistance", this._testAssignRobotsSameDistance);
		this._addTest("testCrossing", this._testAssignRobotsNoCrossing);
	}
	private _testAssignRobotsForSquare() {
		let robots = [new Vector(1, 1), new Vector(-1, 1)].map((pos, i) => {
			let robot = new Robot(i);
			robot.pos = pos;
			return robot;
		});
		let positions = [new Vector(1, -1), new Vector(-1, -1)];
		let assignments = assignRobots(robots, positions);
		this._assert_deep_eq(assignments, [0, 1]);
	}
	private _testAssignRobotsForParallelogram() {
		let robots = [new Vector(0, 1), new Vector(-1, 1)].map((pos, i) => {
			let robot = new Robot(i);
			robot.pos = pos;
			return robot;
		});
		let positions = [new Vector(0, -1), new Vector(1, -1)];
		let assignments = assignRobots(robots, positions);
		this._assert_deep_eq(assignments, [1, 0]);
	}
	private _testAssignRobotsSameDistance() {
		let robots = [new Vector(0, 0), new Vector(0, 2)].map((pos, i) => {
			let robot = new Robot(i);
			robot.pos = pos;
			return robot;
		});
		let positions = [new Vector(0, -1), new Vector(0, 1)];
		let assignments = assignRobots(robots, positions);
		this._assert_deep_eq(assignments, [0, 1]);
	}
	private _testAssignRobotsNoCrossing() {
		// check if someone is using distanceToSq instead of distanceTo
		// this order of points also checks if the assignment is in the correct order (position -> robot vs robot -> position)
		let robots = [new Vector(0.45, 2.4), new Vector(0.45, 2.06), new Vector(0.65, 0.75)].map((pos, i) => {
			let robot = new Robot(i);
			robot.pos = pos;
			return robot;
		});
		let positions = [new Vector(2, -2), new Vector(4, -2), new Vector(3, -2)];
		let assignments = assignRobots(robots, positions);
		this._assert_deep_eq(assignments, [2, 0, 1]);
	}

}
export let testClass = MovesHelper;
