import * as geom from "base/geom";
import { Position } from "base/vector";
import * as vis from "base/vis";

import { computeMunkres, Matrix } from "glados/lib/munkres";

/**
 * This functions draws the two circles, in which a volley pass it not possible.
 * It also returns the values from the indiscribed angle theorem.
 * This MUST be considered in every static freekick
 */
export function volleyCircle(point1: Position, point2: Position, theta: number): [Position, Position, number] {
	let [center1, center2, radius] = geom.inscribedAngle(point1, point2, theta);
	vis.addCircle("volleyCycle", center1, radius, vis.colors.redHalf, true);
	vis.addCircle("volleyCycle", center2, radius, vis.colors.redHalf, true);
	return [center1, center2, radius];
}

/**
 * This function uses the munkres algorithm to optimize the sum of distances from
 * each robot to the assigned position. O(n^3)
 * @param robots - List of robots to assign. the first ignoreFirstNRobots are assigned to their index
 * @param positions - List of positions to assign the remaining robots to
 * @returns the assignments. Use like this: robots[assignment[i]] -> assign to positions[i]
 */
export function assignRobots(robots: { pos: Position }[], positions: Position[]): number[] {
	if (robots.length !== positions.length) {
		throw new Error("Moveshelper: unmatching number of robots and positions!");
	}

	let mat: Matrix = [];

	// create a squared matrix for robots and their distance to the positions
	for (let i = 0; i < robots.length; i++) {
		mat.push([]);
		for (let j = 0; j < positions.length; j++) {
			// filling the mat with all distances between a robot and a position
			// not squared to guarantee a planar graph (no crossing)
			let dist = robots[i].pos.distanceTo(positions[j]);
			mat[i][j] = dist;
		}
	}
	// use the munkres algorithm
	let indices = computeMunkres(mat);

	const assignment: number[] = [];
	for (let a = 0; a < indices.length; a++) {
		assignment[indices[a][1]] = indices[a][0];
	}

	return assignment;
}
