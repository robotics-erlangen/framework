import { FriendlyRobot } from "base/robot";
import * as vis from "base/vis";

export function addDummyVisualizations(robot: FriendlyRobot) {
	if (!robot.canShoot) {
		vis.addPizza("dummy: can't shoot", robot.pos, 1.5 * robot.radius, robot.dir + 3 * Math.PI / 2,
		 robot.dir + Math.PI / 2, vis.colors.cyanHalf, true);
	}

	if (!robot.canDribble) {
		vis.addPizza("dummy: can't dribble", robot.pos, 1.5 * robot.radius, robot.dir + Math.PI / 2,
		robot.dir - Math.PI / 2, vis.colors.blackHalf, true);
	}
}
