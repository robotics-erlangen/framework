import * as debug from "base/debug";
import * as Field from "base/field";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageType } from "glados/control/messaging";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";
import * as Rating from "glados/util/rating";
const G = World.Geometry;

const MANMARK_DISTANCE_THRESHOLD = 0.2;

interface DebugTable {
	startingPoint: Position;
	ballPos: Position;
	passBlocked: boolean;
	line: Vector; cw: Vector;
	cwDist: number;
	cwRating: number;
	ccw: Vector;
	ccwDist: number;
	ccwRating: number;
	feintPos: Position;
}

function draw(table: DebugTable) {
	let t = table;
	debug.push("sideStep Debug");
	for (let [a, b] of Object.entries(t)) {
		debug.set(a, b);
	}
	debug.pop();
	vis.addCircle("sideStep", t.startingPoint, 0.05, vis.colors.blue, true);
	vis.addCircle("sideStep", t.feintPos, 0.05, vis.colors.red, true);
	vis.addPath("sideStep", [t.ballPos, t.ballPos + t.cw.withLength(t.cwDist)], vis.fromTemperature(t.cwRating));
	vis.addPath("sideStep", [t.ballPos, t.ballPos + t.ccw.withLength(t.ccwDist)], vis.fromTemperature(t.ccwRating));
}

type PassInfo = {target: FriendlyRobot, ballPos: Position, time: number};

export class SideStep extends Task {
	private _debugTable: DebugTable;
	private _feintPos: Position;
	private _passInfo: PassInfo;

	private _suggestPass: SuggestPass;
	private _remainingTime: number | undefined;

	constructor(agent: Agent, passInfo: PassInfo, remainingFreeTime: number | undefined) {
		super(agent);
		this._passInfo = passInfo;
		let passBlocked = this._projectBotsOnLine(this._robot.pos, passInfo.ballPos) > MANMARK_DISTANCE_THRESHOLD;
		let line;
		if (passBlocked) {
			line = (passInfo.ballPos - World.Ball.pos).normalized();
		} else {
			line = (G.OpponentGoal - passInfo.ballPos).normalized();
		}
		let clockwise = line.perpendicular();
		let counterClockwise = line.rotated(Math.PI / 2);
		let [ccwDist, ccwRating] = this._rateLine(counterClockwise);
		let [cwDist, cwRating] = this._rateLine(clockwise);
		if (cwRating > ccwRating) {
			this._feintPos = passInfo.ballPos + clockwise.withLength(cwDist);
		} else {
			this._feintPos = passInfo.ballPos + counterClockwise.withLength(ccwDist);
		}
		this._debugTable = {
			startingPoint: this._passInfo.ballPos,
			ballPos: passInfo.ballPos,
			passBlocked: passBlocked,
			line: line, cw: clockwise,
			cwDist: cwDist,
			cwRating: cwRating,
			ccw: counterClockwise,
			ccwDist: ccwDist,
			ccwRating: ccwRating,
			feintPos: this._feintPos
		};

		this._suggestPass = new SuggestPass(this._robot, this._messaging);
		this._remainingTime = remainingFreeTime;
	}

	private _projectBotsOnLine(point1: Position, point2: Position): number {
		let bestDist = Infinity;
		for (let r of World.OpponentRobots) {
			let dist = r.pos.distanceToLineSegment(point1, point2);
			if (dist < bestDist) {
				bestDist = dist;
			}
		}
		return bestDist;
	}

	private _rateLine(line: Vector): [number, number] {
		let [intersection, lambda] = Field.nextAllowedFieldLineCut(this._passInfo.ballPos, line, this._robot.radius);
		if (intersection) {
			let rating = 1 - Rating.valueToRating(lambda!, 2, 0) / 2;
			let dist = this._projectBotsOnLine(this._passInfo.ballPos, this._passInfo.ballPos + line);
			let distRating = Rating.valueToRating(dist, 1, MANMARK_DISTANCE_THRESHOLD);

			rating = rating - (1 - distRating) / 10;
			return [lambda!, rating];
		} else {
			return [0, 0];
		}
	}

	run() {
		draw(this._debugTable);
		if (this._messaging.receiveTrainer(MessageType.mainAttacker) !== this._robot) {
			this._messaging.sendToTrainerRepeated(MessageType.groupApplication, { name: "striker", payload: {}});
		}

		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];
		if (attackPosition) {
			let earlyAttackTime = this._messaging.receiveSingleSender(MessageType.earliestAttackTime)[1];
			let plannedAttackTime = this._messaging.receiveSingleSender(MessageType.plannedAttackTime)[1];
			let offeredTime = this._passInfo.time - World.Time;
			if (earlyAttackTime != undefined && plannedAttackTime != undefined && this._remainingTime != undefined) {
				let delay = plannedAttackTime - earlyAttackTime;
				if (delay > this._remainingTime) {
					delay = this._remainingTime;
				}
				offeredTime = offeredTime - delay;
			}
			this._suggestPass._suggestPass(this._passInfo.ballPos, attackPosition, offeredTime);
		}

		let obstacleTable: PathHelper.PathHelperParameters = {
			ignorePass: false,
			messaging: this._messaging
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		let viewPos = attackPosition || World.Geometry.OpponentGoal;
		let dir = (viewPos - this._robot.pos).angle();
		this._robot.trajectory.update(ToTarget, this._feintPos, dir);
	}

	updateTime(newTime: number | undefined) {
		this._remainingTime = newTime;
	}
}
