import * as debug from "base/debug";
import {Vector, Position} from "base/vector";
import {FriendlyRobot} from "base/robot";
import * as Referee from "base/referee";
import * as World from "base/world";

import {MessageType} from "glados/control/messaging";
import * as ObserverShoot from "glados/observer/shoot";
import {Shoot} from "glados/task/ability/shoot";
import {Task, Agent} from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import * as Rating from "glados/util/rating";

let CHIP_PASS_DISTANCE_FACTOR = 0.4;
let MIN_PASS_SPEED = 1;
let DEFAULT_PASS_SPEED = 3;

function ratePass (attackPos: Position, targetPos: Position): number {
	let shortestDist = Infinity;
	for (let bot of World.OpponentRobots) {
		let dist = bot.pos.distanceToLineSegment(attackPos, targetPos);
		if (dist < shortestDist) {
			shortestDist = dist;
		}
	}

	return Rating.valueToRating(shortestDist, 0.5, 3);
}

export class Pass extends Task {
	private _targetRobot: FriendlyRobot | undefined;
	private _targetPos: Position;
	private _targetTime: number | undefined;
	private _chipOverride: boolean;
	private _chip: boolean;
	private _passSpeed: number;
	private _ballReceiptPos: Position | undefined;

	private _shoot: Shoot;

	constructor (agent: Agent, targetRobot?: FriendlyRobot, targetPos?: Position, chip?: boolean,
			ballReceiptPos?: Position, targetTime?: number, targetSpeed?: number) {
		super(agent);
		this._targetRobot = targetRobot
		this._targetTime = targetTime
		this._chipOverride = chip != undefined
		this._chip = chip == true
		this._passSpeed = targetSpeed || (this._targetRobot ? this._targetRobot.constants.passSpeed : DEFAULT_PASS_SPEED)
		this._ballReceiptPos = ballReceiptPos

		// retrieve targetPos from messages if no argument was given
		let pos: Position;
		if (targetPos == undefined) {
			if (targetRobot == undefined) {
				throw new Error("anonymous passes need to have a targetPos");
			}
			let sugg = this._messaging.receive(MessageType.passSuggestion).get(targetRobot);
			if (sugg != undefined) {
				pos = sugg.ballPos
			} else {
				pos = targetRobot.pos +
					Vector.fromAngle(targetRobot.dir) * targetRobot.shootRadius
			}
		} else {
			pos = targetPos;
		}
		this._targetPos = pos;

		this._shoot = new Shoot(this._robot, this._messaging, this.setMainAttackerParameters);
	}

	public updateTarget (targetRobot: FriendlyRobot, targetPos: Position, chip?: boolean,
			targetTime?: number, targetSpeed?: number) {
		this._targetRobot = targetRobot
		this._targetPos = targetPos
		this._passSpeed = targetSpeed || targetRobot ? this._targetRobot.constants.passSpeed : DEFAULT_PASS_SPEED
		this._targetTime = targetTime
		this._chipOverride = chip != undefined
		this._chip = chip == true
	}

	

	run () {
	    let obstacleTable = {
	        messaging: this._messaging,
	        ignoreBallPlacementObstacle: true
	    }
	    PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
		debug.set("targetRobot", this._targetRobot)
		debug.set("targetPos", this._targetPos)

		let maxAngleError = 3.5 * Math.PI / 180
		let isFreekickLike = Referee.isFriendlyFreeKickState() || World.RefereeState == "KickoffOffensive"
		if (isFreekickLike) {
			maxAngleError = 1.5 * Math.PI / 180
		}

		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition, true)[1] || World.Ball.pos;

		let attackTime = this._messaging.receiveSingleSender(MessageType.attackTime, true)[1];


		if (!this._chipOverride) {
			let lockTime = World.Ball.speed.length() > 0.5 ? 0.3 : 0.1
			let lockDecision = this._chip != undefined && attackTime && attackTime < World.Time + lockTime
			if (!lockDecision) {
				let corridor = ObserverShoot.evaluatePassCorridor(attackPosition,
					this._targetPos, CHIP_PASS_DISTANCE_FACTOR, isFreekickLike)
				this._chip = corridor == "chip";
			}
		}

		debug.set("chipOverride", this._chipOverride);
		debug.set("chip", this._chip);
		if (this._targetTime != undefined) {
			debug.set("targetTime (rel)", this._targetTime - World.Time);
		}
		debug.set("targetTime", this._targetTime);

		let attackPos = this._ballReceiptPos || World.Ball.pos
		let targetPos = this._targetPos;
		let passSpeed = Math.max((1 - ratePass(attackPos, targetPos)) * this._passSpeed, MIN_PASS_SPEED);
		debug.set("passSpeed", passSpeed);

		if (this._targetRobot == this._robot) {
			this.setMainAttackerParameters(targetPos, this._robot.maxSpeed);
		}

		if (this._chip) {
			this._shoot._chipPass(targetPos, this._ballReceiptPos, this._targetTime, maxAngleError)
		} else {
			if (Referee.isFriendlyFreeKickState() || World.RefereeState === "KickoffOffensive") {
				this._shoot._shootFreeKick(targetPos, this._passSpeed, this._targetTime, maxAngleError)
			} else {
				this._shoot._shoot(targetPos, this._passSpeed, this._targetTime, this._ballReceiptPos, maxAngleError)
			}
		}
	}
}