import { log } from "base/amun";
import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as MathUtil from "base/mathutil";
import { Position } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Behavior } from "glados/agent/base/behavior";
import { RotateAndShoot } from "glados/task/ability/rotateandshoot";
import { Shoot } from "glados/task/ability/shoot";
import { Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";

const G = World.Geometry;
// =====================//
// Tournament Settings //
// =====================//
const distToPost = 0.08; // distance of the target point on goal line to the post
const changeThreshold = 0.5; // set 0 if opponent keeper follows look Dir every time
const keeperPosTolerance = 0.04; // if keeper's distance to the goals center is bigger, we will choose the big free sector
const shootErrorThreshold = geom.degreeToRadian(4.0); // maximum angle error
const keeperMoveSpeedThreshold = 0.5; // for random keeper movement detection

const obstacleTable: PathHelper.PathHelperParameters = {
	ignorePass: true,
	ignorePenaltyDistance: true
};

const goalLine = (G.OpponentGoalLeft - G.OpponentGoalRight).normalized();
function cornerPoint(corner: "Left" | "Right") {
	if (corner === "Left") {
		return G.OpponentGoalLeft - (goalLine * distToPost);
	} else {
		return G.OpponentGoalRight + (goalLine * distToPost);
	}
}

export class ShootPenalty extends Task {
	private _lookDir: "Right" | "Left";
	private _targetPos: Position | undefined = undefined;
	private _startTime: number = World.Time;
	private _waitTime: number;
	private _cornerChange: boolean = false;

	private _shoot: Shoot;
	private _rotateAndShoot: RotateAndShoot;

	private _collectedBallPosition: Position;
	private _ballCounter: number = 0;

	public constructor(behavior: Behavior) {
		super(behavior);
		this._lookDir = "Right";
		if (MathUtil.randomInt([1, 2]) < 2) {
			this._lookDir = "Left";
		}
		this._waitTime = MathUtil.random() * 5 + 2;

		this._shoot = new Shoot(this);
		this._rotateAndShoot = new RotateAndShoot(this);

		this._collectedBallPosition = World.Ball.pos;
		this._ballCounter = 1;
	}

	public run() {
		if (World.Ball.isPositionValid() && World.Ball.detectionQuality > 0.4) {
			this._collectedBallPosition = this._collectedBallPosition + World.Ball.pos;
			this._ballCounter += 1;
		}

		let assumedBallPos = this._collectedBallPosition / this._ballCounter;
		vis.addCircle("assumed ball", assumedBallPos, 0.03, vis.colors.red);

		const DIST_TO_BALL = 0.015;
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable);
		if (this._targetPos == undefined) {
			let keeper = World.OpponentKeeper!;
			let keeperInsideDefArea = keeper != undefined && Field.isInOpponentDefenseArea(keeper.pos, keeper.radius);
			debug.set("keeperInsideDefArea", keeperInsideDefArea);
			if (World.Time - this._startTime < this._waitTime) {
				this._shoot.catchBall._catchBall(cornerPoint(this._lookDir), Constants.positionError + DIST_TO_BALL);
				// detect random keeper movement
				if (keeperInsideDefArea
						&& ((keeper.speed.x > keeperMoveSpeedThreshold && this._lookDir === "Left")
							|| (keeper.speed.x < -keeperMoveSpeedThreshold && this._lookDir === "Right"))) {
					log(`keeper x speed: ${keeper.speed.x}`);
					this._targetPos = cornerPoint(this._lookDir);
				}
			} else { // choose a corner
				if (keeperInsideDefArea) {
					if (Math.abs(keeper.pos.x) > keeperPosTolerance) {
						if (keeper.pos.x > 0) {
							this._cornerChange = (this._lookDir !== "Left");
							this._lookDir = "Left";
						} else {
							this._cornerChange = (this._lookDir !== "Right");
							this._lookDir = "Right";
						}
					} else {
						let otherDir: "Left" | "Right" = (this._lookDir === "Left") ? "Right" : "Left";
						if (MathUtil.random() > changeThreshold) {
							this._cornerChange = true;
							this._lookDir = otherDir;
						}
					}
				}
				this._targetPos = cornerPoint(this._lookDir);
			}
		} else {
			vis.addCircle("t/shootpenalty: PenaltyTargetPos", this._targetPos, 0.02, vis.colors.blue, true);
			if (this._cornerChange) {
				this._rotateAndShoot._rotateAndShoot((this._targetPos - assumedBallPos).angle(), assumedBallPos);
			} else {
				this._shoot._shoot(this._targetPos, Infinity, undefined, undefined, shootErrorThreshold);
			}
		}
	}
}
