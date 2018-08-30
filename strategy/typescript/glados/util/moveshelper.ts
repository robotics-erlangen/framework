import * as geom from "base/geom";
import {log} from "base/globals";
import {Robot} from "base/robot";
import {Position} from "base/vector";
import * as vis from "base/vis";

// this function draws the two circles, in which a volley pass is not possible
// it also returns the values from the indiscribed angle theorem
// this MUST be considered in every static freekick
export function volleyCircle (point1: Position, point2: Position, theta: number): [Position, Position, number] {
	let [center1, center2, radius] = geom.inscribedAngle(point1, point2, theta);
	vis.addCircle("volleyCycle", center1, radius, vis.colors.redHalf, true);
	vis.addCircle("volleyCycle", center2, radius, vis.colors.redHalf, true);
	return [center1, center2, radius];
}

function createOptionsTableRec (options: number): number[][] {
	let lastTable: number[][] = [[]];
	if (options > 1) {
		lastTable = createOptionsTableRec(options - 1);
	}
	let resultTable: number[][] = [];
	for (let part of lastTable) {
		for (let i = 0;i<options;i++) {
			let partCopy = part.slice();
			partCopy.splice(i, 0, options);
			resultTable.push(partCopy);
		}
	}
	return resultTable;
}

// this function performs a least squares optimization of the distance
// between each robot and the assigned position
// as it uses brute force, it should not be called with more than 4 positions
// @param robots table - list of robots to assign. the first ignoreFirstNRobots are assigned to their index
// @param positions table - list of positions to assign the remaining robots to
// @param ignoreFirstNRobots number - ignore the first n robots in robots during assignment
// @return table - assignments. use like this: robots[assignment[i]] -> assign to positions[i]
export function assignRobots (robots: {pos: Position}[], positions: Position[], ignoreFirstNRobots: number): number[] {
	if (robots.length - ignoreFirstNRobots != positions.length) {
		throw new Error("Moveshelper: unmatching number of robots and positions!");
	}
	let assignment: number[] = [];
	for (let i = 1; i<ignoreFirstNRobots;i++) {
		assignment.push(i);
	}

	let options = createOptionsTableRec(positions.length);
	let bestOptionIndex = 0;
	let bestOptionScore = Infinity;
	for (let i = 0;i<options.length;i++) {
		let option = options[i];
		let totalDistance = 0;
		for (let b = 0;b<option.length;b++) {
			let id = option[b];
			totalDistance = totalDistance + robots[ignoreFirstNRobots + id - 1].pos.distanceToSq(positions[b]);
		}
		if (totalDistance < bestOptionScore) {
			bestOptionScore = totalDistance;
			bestOptionIndex = i;
		}
	}


	for (let index of options[bestOptionIndex]) {
		assignment.push(index + ignoreFirstNRobots - 1);
	}

	return assignment;
}