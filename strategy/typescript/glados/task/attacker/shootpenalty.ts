import * as Constants from "base/constants";
import {log} from "base/globals";
import * as debug from "base/debug";
import * as Field from "base/field";
import {Position} from "base/vector";
import * as MathUtil from "base/mathutil";
import * as vis from "base/vis";
import * as World from "base/world";

import {Task, Agent} from "glados/task/base";
import {Shoot} from "glados/task/ability/shoot";
import {RotateAndShoot} from "glados/task/ability/rotateandshoot";
import * as PathHelper from "glados/trajectory/pathhelper";

const G = World.Geometry;
//=====================//
// Tournament Settings //
//=====================//
const distToPost = 0.08; // distance of the target point on goal line to the post
const changeThreshold = 0.5; // set 0 if opponent keeper follows look Dir every time
const KeeperPosTolerance = 0.04; // if keeper's distance to the goals center is bigger, we will choose the big free sector
const shootErrorThreshold = 4.0 * Math.PI/180; // maximum angle error
const keeperMoveSpeedThreshold = 0.5; // for random keeper movement detection

const obstacleTable: PathHelper.PathHelperParameters = {
    ignorePass: true,
    ignorePenaltyDistance: true
};

const goalLine = (G.OpponentGoalLeft - G.OpponentGoalRight).normalize();
function cornerPoint (corner: "Left" | "Right") {
	if (corner == "Left") {
		return G.OpponentGoalLeft - (goalLine * distToPost)
	} else {
		return G.OpponentGoalRight + (goalLine * distToPost)
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

	constructor (agent: Agent) {
		super(agent);
		this._lookDir = "Right"
		if (MathUtil.randomInt([1,2]) < 2) {
			this._lookDir = "Left"
		}
		this._waitTime = MathUtil.random() * 5 + 2;

		this._shoot = new Shoot(this._robot, this._messaging, this.setMainAttackerParameters);
		this._rotateAndShoot = new RotateAndShoot(this._robot);
	}

	run () {
		const DIST_TO_BALL = 0.015;
	    PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
		if (this._targetPos == undefined) {
			let keeper = World.OpponentKeeper!;
			let keeperInsideDefArea =  keeper != undefined && Field.isInOpponentDefenseArea(keeper.pos, keeper.radius)
			debug.set("keeperInsideDefArea", keeperInsideDefArea)
			if (World.Time - this._startTime < this._waitTime) {
				this._shoot._catchBall._catchBall(cornerPoint(this._lookDir), Constants.positionError + DIST_TO_BALL)
				if (keeperInsideDefArea) { // detect random keeper movement
					if ((keeper.speed.x > keeperMoveSpeedThreshold && this._lookDir == "Left")  ||
						(keeper.speed.x < -keeperMoveSpeedThreshold && this._lookDir == "Right")) {
						log("keeper x speed: "  +  keeper.speed.x)
						this._targetPos = cornerPoint(this._lookDir)
					}
				}
			} else {// choose a corner
				if (keeperInsideDefArea) {
					if (Math.abs(keeper.pos.x) > KeeperPosTolerance) {
						if (keeper.pos.x > 0) {
							this._cornerChange = (this._lookDir != "Left")
							this._lookDir = "Left"
						} else {
							this._cornerChange = (this._lookDir != "Right")
							this._lookDir = "Right"
						}
					} else {
						let otherDir: "Left" | "Right" = (this._lookDir == "Left") ? "Right" : "Left"
						if (MathUtil.random() > changeThreshold) {
							this._cornerChange = true
							this._lookDir = otherDir
						}
					}
				}
				this._targetPos = cornerPoint(this._lookDir)
			}
		} else {
			vis.addCircle("t/shootpenalty: PenaltyTargetPos", this._targetPos, 0.02, vis.colors.blue, true)
			if (this._cornerChange) {
				this._rotateAndShoot._rotateAndShoot((this._targetPos - World.Ball.pos).angle())
			} else {
				this._shoot._shoot(this._targetPos, Infinity, undefined, undefined, shootErrorThreshold)
			}
		}
	}
}