import * as Cache from "base/cache";
import {Robot} from "base/robot";


function _join (listA: Robot[], listB: Robot[]): Robot[] {
	return listA.concat(listB);
}
export let join: (listA: Robot[], listB: Robot[])=> Robot[] = Cache.forFrame(_join);

function _excludeRobot (list: Robot[], robot: Robot): Robot[] {
	let result = list.slice();
	for (let i = 0;i<list.length;i++) {
		let r = list[i];
		if (r == robot) {
			result.splice(i, 1);
			break;
		}
	}
	return result;
}
export let excludeRobot: (list: Robot[], robot: Robot)=> Robot[] = Cache.forFrame(_excludeRobot);

function _excludeRobots (list: Robot[], robots: Robot[]): Robot[] {
	let result: Robot[] = [];
	for (let r of list) {
		let found = false;
		for (let robot of robots) {
			if (r == robot) {
				found = true;
			}
		}
		if (!found) {
			result.push(r);
		}
	}
	return result;
}
export let excludeRobots: (list: Robot[], robots: Robot[])=> Robot[] = Cache.forFrame(_excludeRobots);