import * as pb from "base/protobuf";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import * as World from "base/world";

import * as ObserverReferee from "glados/observer/referee";

interface Outliers {
	size: number;
	next?: number;
	sum?: number;
}
interface RingBuffer {
	size: number;
	sum: number;
	next: number;
	outliers: Outliers;
	[index: number]: number;
}
type ErrorTable = { [name: string]: number };

let errorTables = new Map<FriendlyRobot, ErrorTable>();
let batteryTable: Map<FriendlyRobot, RingBuffer> = new Map<FriendlyRobot, RingBuffer>();
const BATTERY_TABLE_SIZE = 50;

export function getAverageBatterySate(robot: FriendlyRobot): number {
	if (!batteryTable.has(robot) || batteryTable.get(robot)!.size === 0) {
		return 1;
	}
	return batteryTable.get(robot)!.sum / batteryTable.get(robot)!.size;
}

function initBatteryTable(robot: FriendlyRobot) {
	batteryTable.set(robot, { size: 0, next: 1, sum: 0, outliers: { size: 0, next: 1, sum: 0 } });
}

function insertRingBuffer(ringbuffer: any, value: number) {
	if (ringbuffer == undefined) {
		return;
	}

	if (ringbuffer.next == undefined) {
		ringbuffer.size = 0;
		ringbuffer.next = 1;
		ringbuffer.sum = 0;
	}

	if (ringbuffer.size < BATTERY_TABLE_SIZE) {
		ringbuffer.sum = ringbuffer.sum + value;
		ringbuffer.size = ringbuffer.size + 1;
	} else {
		ringbuffer.sum = ringbuffer.sum + value - ringbuffer[ringbuffer.next];
	}
	ringbuffer[ringbuffer.next] = value;
	ringbuffer.next = ringbuffer.next + 1 % BATTERY_TABLE_SIZE;
}

function addBatteryState(robot: FriendlyRobot, newBatteryState: number) {
	let robotBatteryTable = batteryTable[robot];
	if (robotBatteryTable == undefined) {
		initBatteryTable(robot);
		robotBatteryTable = batteryTable[robot];
	}
	if (robotBatteryTable!.size === BATTERY_TABLE_SIZE) {
		let avg = getAverageBatterySate(robot);
		if (Math.abs(avg - newBatteryState) > 0.2) {
			if (robotBatteryTable!.outliers.size > 15) {
				batteryTable[robot] = <any> robotBatteryTable!.outliers;
				batteryTable[robot]!.outliers = { size: 0 };
				addBatteryState(robot, newBatteryState);
				return;
			}
			insertRingBuffer(robotBatteryTable!.outliers, newBatteryState);
			return;
		}
	}
	robotBatteryTable!.outliers = { size: 0 };
	insertRingBuffer(robotBatteryTable, newBatteryState);
}

export function getErrorTable(robot: FriendlyRobot) {
	return errorTables[robot];
}

function convertErrorTable(errorTable: ErrorTable): ErrorTable {
	let newTable: ErrorTable = {};
	for (let [k, v] of Object.entries(errorTable)) {
		if (typeof(v) === "number") {
			newTable[k] = v;
		} else if (v != undefined) {
			newTable[k] = 1;
		}
	}
	return newTable;
}

function addErrorTables(errorTable1: any, errorTable2: any): ErrorTable {
	if (errorTable1 == undefined && errorTable2 == undefined) {
		return {};
	}
	if (errorTable1 == undefined) {
		return convertErrorTable(errorTable2!);
	}
	if (errorTable2 == undefined) {
		return convertErrorTable(errorTable1);
	}
	let newTable: ErrorTable = {};
	for (let [k, v] of Object.entries(errorTable1)) {
		if (typeof(v) === "number") {
			newTable[k] = v;
		} else if (v != undefined) {
			newTable[k] = 1;
		}
	}
	for (let [k, v] of Object.entries(errorTable2)) {
		if (typeof(v) === "number") {
			// errorTable2 is newer than errorTable1, so override errorTable1
			newTable[k] = v;
		} else if (v != undefined) {
			if (newTable[k] != undefined) {
				newTable[k] = newTable[k] + 1;
			} else {
				newTable[k] = 1;
			}
		}
	}
	return newTable;
}

function updateErrorTables(isLeavingStop: boolean) {
	if (isLeavingStop) {
		errorTables = new Map<FriendlyRobot, ErrorTable>();
	}

	for (let r of World.FriendlyRobots) {
		if (r.radioResponse && r.radioResponse.error_present) {
			// we have an error, save it for debugging purposes
			errorTables[r] = addErrorTables(errorTables[r], r.radioResponse.extended_error);
		}
	}
}

// we don't have any feedback by our robots. At least we have to assume its like that
// We still want to be able to detect broken bots.
// To do so, we use the previous moveTo. If it is far (~0.5m) from our current pos while our speed is slow we increase a counter.
// If that stays true for 4.5 s (that is, 450 runs), we consider the robot to be damaged.
// We reset this counter if the robot gets fast eanough, or reaches its destination.
// We want the robot to stay at the error position if it was decided that it's broken. Therefore, we don't tick down due to position if the robot was
// detected as failure, and will only tick down if a certain speed was reached.
// If the robot is invisible, speedError does tick down, this is to ensure that a exchanged robot that may have been repaired by humans is ok after reinsertion
// If the strategy is being replayed, there's no point in counting up or down. As starting the replay results in a fresh load this will disabled this detection during replays
let speedError: Map<FriendlyRobot, number> = new Map<FriendlyRobot, number>();
function updateSpeedError() {
	let halfSpeed = Referee.isSlowDriveState() ? 0.75 : 1.5;
	for (let robot of World.FriendlyRobots) {
		if (robot.prevMoveTo && !World.IsReplay && World.WorldStateSource() === pb.world.WorldSource.REAL_LIFE) {
			if (robot.speed.lengthSq() < halfSpeed * halfSpeed && robot.pos.distanceToSq(robot.prevMoveTo) > 0.5 * 0.5) {
				if (speedError.has(robot) && speedError[robot]! <= 450) {
					speedError[robot] = speedError[robot]! + 1;
				} else if (!speedError.has(robot)) {
					speedError[robot] = 1;
				}
			} else if (speedError.has(robot) && speedError[robot]! >= 10 && (speedError[robot]! <= 300 ||
				robot.speed.lengthSq() > halfSpeed * halfSpeed)) {
				speedError[robot] = speedError[robot]! - 10;
			}
		}
	}
	for (let robot of World.FriendlyInvisibleRobots) {
		if (speedError.has(robot)) {
			speedError[robot] = speedError[robot]! - 1;
		}
	}
}

export function getSpeedErrorCount(robot: FriendlyRobot): number {
	return speedError.get(robot) || 0;
}

export function _update() {
	let leavingStop = ObserverReferee.isLeavingStop();
	for (let r of World.FriendlyRobots) {
		if (r.radioResponse && r.radioResponse.battery != undefined) {
			addBatteryState(r, r.radioResponse.battery);
		}
	}
	updateErrorTables(leavingStop);
	updateSpeedError();
}
