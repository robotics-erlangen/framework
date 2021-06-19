import { Vector } from "base/vector";

import * as Robot from "glados/observer/robot";
import { UnitTest } from "glados/test/unit/unittest";

export class GladosObserverRobot extends UnitTest {
	constructor() {
		super();

		this.addTest("getDribblerEdges", this.testGetDribblerEdges);
	}

	private testGetDribblerEdges() {
		// "Robot" looking with angle 0 (i.e in Positive x direction)
		const [rightOne, leftOne] = Robot.getDribblerEdges({
			dir: 0,
			dribblerPos: new Vector(0, 0),
			dribblerWidth: 1
		});
		amun.log(`left one = ${leftOne}, rightOne = ${rightOne}`);
		this.assert_less_than(rightOne.distanceTo(new Vector(0.0, -0.5)), 0.01);
		this.assert_less_than(leftOne.distanceTo(new Vector(0.0, 0.5)), 0.01);

		// "Robot" looking with angle 90 (i.e in Positive y direction)
		const [rightTwo, leftTwo] = Robot.getDribblerEdges({
			dir: Math.PI / 2,
			dribblerPos: new Vector(0, 0),
			dribblerWidth: 1,
		});
		this.assert_less_than(rightTwo.distanceTo(new Vector(0.5, 0)), 0.01);
		this.assert_less_than(leftTwo.distanceTo(new Vector(-0.5, 0)), 0.01);
	}
}

export let testClass = GladosObserverRobot;
