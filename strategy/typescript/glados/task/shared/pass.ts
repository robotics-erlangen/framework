import * as debug from "base/debug";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { formatTimestamp, MessageType } from "glados/control/messaging";
import * as ObserverBall from "glados/observer/ball";
import * as ObserverCrash from "glados/observer/crash";
import * as ObserverShoot from "glados/observer/shoot";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as Rating from "glados/util/rating";

interface Parameters {
	targetRobot?: FriendlyRobot;
	targetPos?: Position;
	chip?: boolean;
	ballReceiptPos?: Position;
	targetTime?: number;
	targetSpeed?: number;
	highPrecision?: boolean;
	ignoreCrash?: boolean;
}

const CHIP_PASS_DISTANCE_FACTOR = 0.4;
const MIN_PASS_SPEED = 1;
const DEFAULT_PASS_SPEED = 3;

/**
 * Rates the feasibility of a pass based on the distance to the nearest opponent.
 * @param attackPos - The position from where the pass is made.
 * @param targetPos - The position where the pass is aimed.
 * @returns A rating value between 0 and 1 indicating the pass quality.
 */
function ratePass(attackPos: Position, targetPos: Position): number {
	let shortestDist = Infinity;
	for (let bot of World.OpponentRobots) {
		let dist = bot.pos.distanceToLineSegment(attackPos, targetPos);
		if (dist < shortestDist) {
			shortestDist = dist;
		}
	}

	return Rating.valueToRating(shortestDist, 0.5, 3);
}

/**
 * Determines if any opponent is close to the ball.
 * @returns True if an opponent is close to the ball, false otherwise.
 */
function isOpponentClose(): boolean {
	const [, oppTimeToBall] = ObserverBall.firstRobotAtBall(World.OpponentRobots);
	return oppTimeToBall < 2.5;
}

export class Pass extends Task {
	private _targetRobot: FriendlyRobot | undefined;
	private _targetPos: Position;
	private _targetTime: number | undefined;
	private _chipOverride: boolean;
	private _chip: boolean;
	private _passSpeed: number;
	private _ballReceiptPos: Position | undefined;
	private _highPrecision: boolean;
	private _ignoreCrash: boolean;

	private _shoot: Shoot;

	public constructor(behavior: Behavior, parameters: Parameters) {
		super(behavior);

		this._targetRobot = parameters.targetRobot;
		this._targetTime = parameters.targetTime;
		this._chipOverride = parameters.chip !== undefined;
		this._chip = parameters.chip === true;
		this._passSpeed = parameters.targetSpeed
			?? this._targetRobot?.constants.passSpeed
			?? DEFAULT_PASS_SPEED;
		this._ballReceiptPos = parameters.ballReceiptPos;
		this._highPrecision = parameters.highPrecision === true;
		this._ignoreCrash = parameters.ignoreCrash === true;

		// retrieve targetPos from messages if no argument was given
		let pos: Position;
		if (parameters.targetPos == undefined) {
			if (parameters.targetRobot == undefined) {
				throw new Error("anonymous passes need to have a targetPos");
			}
			let sugg = this._messaging.receive(MessageType.passSuggestion).get(parameters.targetRobot);
			if (sugg != undefined) {
				pos = sugg.ballPos;
			} else {
				pos = parameters.targetRobot.dribblerPos;
			}
		} else {
			pos = parameters.targetPos;
		}
		this._targetPos = pos;

		this._shoot = new Shoot(this);
	}

	/**
	 * Updates the target for the pass.
	 * @param targetRobot - The friendly robot to which the pass is aimed.
	 * @param targetPos - The position where the pass is aimed.
	 * @param chip - Indicates if a chip pass should be performed.
	 * @param targetTime - The time at which the pass should be completed.
	 * @param targetSpeed - The speed at which the pass should be delivered.
	 */
	public updateTarget(targetRobot: FriendlyRobot, targetPos: Position, chip?: boolean,
			targetTime?: number, targetSpeed?: number) {
		this._targetRobot = targetRobot;
		this._targetPos = targetPos;
		this._passSpeed = targetSpeed != undefined ? targetSpeed : targetRobot ? this._targetRobot.constants.passSpeed : DEFAULT_PASS_SPEED;
		if (targetTime === Infinity) {
			throw new Error("targetTime Infinity will result in a crash next frame");
		}
		this._targetTime = targetTime;
		this._chipOverride = chip != undefined;
		this._chip = chip === true;
	}

	public run() {
		let obstacleTable = {
			task: this,
			ignoreBallPlacementObstacle: true
		};
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		debug.set("targetRobot", this._targetRobot);
		debug.set("targetPos", this._targetPos);

		let isFreekickLike = Referee.isFriendlyFreeKickState()
			|| World.RefereeState === "KickoffOffensive"
			|| this._highPrecision
			|| (!this._ignoreCrash && ObserverCrash.isCrashed());

		let maxAngleError;
		if (isFreekickLike) {
			maxAngleError = geom.degreeToRadian(2.5);
		} else if (!isOpponentClose()) {
			maxAngleError = geom.degreeToRadian(3);
		} else {
			maxAngleError = geom.degreeToRadian(3.5);
		}

		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition, true)[1] || World.Ball.pos;

		let attackTime = this._messaging.receiveSingleSender(MessageType.plannedAttackTime, true)[1];


		if (!this._chipOverride) {
			let lockTime = World.Ball.speed.length() > 0.5 ? 0.3 : 0.1;
			let lockDecision = this._chip != undefined && attackTime != undefined && attackTime < World.Time + lockTime
				&& !Referee.isFriendlyFreeKickState();
			if (!lockDecision) {
				let corridor = ObserverShoot.evaluatePassCorridor(attackPosition,
					this._targetPos, CHIP_PASS_DISTANCE_FACTOR, isFreekickLike);
				this._chip = corridor === "chip";
			}
		}

		debug.set("chipOverride", this._chipOverride);
		debug.set("chip", this._chip);
		debug.set("targetTime", this._targetTime !== undefined ? formatTimestamp(this._targetTime) : undefined);

		let attackPos = this._ballReceiptPos || World.Ball.pos;
		let targetPos = this._targetPos;
		let passSpeed = Math.max((1 - ratePass(attackPos, targetPos)) * this._passSpeed, MIN_PASS_SPEED);
		debug.set("passSpeed", passSpeed);

		if (this._targetRobot === this._robot) {
			this.setMainAttackerParameters(targetPos, this._robot.maxSpeed);
		}

		if (this._chip) {
			this._shoot._chipPass(targetPos, this._ballReceiptPos, undefined, maxAngleError);
		} else {
			if (isFreekickLike) {
				this._shoot._shootFreeKick(targetPos, this._passSpeed, this._targetTime, maxAngleError);
			} else {
				this._shoot._shoot(targetPos, this._passSpeed, this._targetTime, this._ballReceiptPos, maxAngleError);
			}
		}
	}
}
