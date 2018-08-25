import * as debug from "base/debug";
import {Robot} from "base/robot";
import {Position} from "base/vector";
import * as World from "base/world";
import * as Field from "base/field";
import {MessageType} from "glados/control/messaging";
import * as PathHelper from "glados/trajectory/pathhelper";
import {ToTarget} from "glados/trajectory/totarget";
import * as Defense from "glados/util/defense";
import {Task, Agent} from "glados/task/base";


const BLOCK_DIST_MAX = 0.05;
const BLOCK_DIST_HYSTERESIS = 0.02;
const BLOCK_POS_ALPHA = 0.1;
const BLOCK_POS_PRECISION = 0.01;
const DEFENSE_AREA_MIN_DISTANCE = 0.24;

export class ManMark extends Task {
	private _targetRobot: Robot;
	private _oldPosition: Position | undefined;
	private _blockingShot: boolean = false;
	private _obstacleTable: PathHelper.PathHelperParameters;


	constructor(agent: Agent, targetRobot: Robot) {
		super(agent);
		if (targetRobot == undefined) {
			throw new Error("ManMark task needs a target robot");
		}
		this._targetRobot = targetRobot;
		this._obstacleTable = {
			ignoreBall: true,
			messaging: this._messaging
		};
	}

	run () {
		let preferredPos = Defense.manMarkPos(this._targetRobot);
		let preferredDir = (World.Ball.pos - this._robot.pos).angle();

		// pos before the defense area; the possibility of crashing into centerbacks was considered
		// but disregarded because blocking a shot on the goal is more important,
		// and the probabilty of it being the final position is small
		let intersectionDefenseArea = Field.intersectRayDefenseArea(preferredPos,
				World.Geometry.FriendlyGoal - preferredPos,
				this._robot.radius + DEFENSE_AREA_MIN_DISTANCE, true)[0];

		let moveDest;
		let basePos;
		if (intersectionDefenseArea) {
			// calculate new position between ball (regarding robot shootRadius) and the intersection with defense area
			moveDest = preferredPos //+ (intersectionDefenseArea - preferredPos).setLength(0)//this._robot.shootRadius + World.Ball.radius)
			moveDest = Defense.fastestPointInInterval(this._robot, moveDest, intersectionDefenseArea,
								this._oldPosition, BLOCK_POS_PRECISION, BLOCK_POS_ALPHA);
			basePos = intersectionDefenseArea;
		} else {
			// case if there isn't an intersection with the defense area
			moveDest = preferredPos + (this._robot.pos-preferredPos).setLength(this._robot.shootRadius + World.Ball.radius);
			basePos = this._robot.pos;
		}

		// remember position for the next iteration
		this._oldPosition = moveDest;

		let distToLine = this._robot.pos.distanceToLineSegment(basePos, preferredPos);
		if (distToLine <= BLOCK_DIST_MAX) {
			this._blockingShot = true;
		} else if (distToLine > BLOCK_DIST_MAX + BLOCK_DIST_HYSTERESIS) {
			this._blockingShot = false;
		}

		debug.set("moveDest posOnLine", moveDest);
		debug.set("moveDest distToLine", distToLine);

		// local ignoreBall = false

		if (this._blockingShot) {
			//if closestOpponentRobot then
			//	moveDest = this._moveToNearBlock(futureBall, closestOpponentRobot)
			//else
			//	ignoreBall = true
				moveDest = preferredPos + (World.Geometry.FriendlyGoal - preferredPos).setLength(
							World.Ball.radius + this._robot.shootRadius);
			//end
		}

		this._obstacleTable.ignoreOpponentRobots = Field.distanceToFriendlyDefenseArea(this._robot.pos, this._robot.radius)
			< 4 * this._robot.radius + 0.13;

		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		preferredPos = moveDest;

		this._robot.trajectory.update(ToTarget, preferredPos, preferredDir, undefined, this._targetRobot.speed);
		this._messaging.sendBroadcast(MessageType.moveDest, preferredPos);
	}
}