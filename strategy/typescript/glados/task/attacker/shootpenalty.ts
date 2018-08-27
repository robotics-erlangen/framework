let Shoot = require "task/ability/shoot"
let RotateAndShoot = require "task/ability/rotateandshoot"
let ShootPenalty = Class("Task.ShootPenalty", require "task/base",
	Shoot, RotateAndShoot)

import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import * as vis from "base/vis";
import * as World from "base/world";

import * as PathHelper from "glados/trajectory/pathhelper";

let G = World.Geometry
//=====================//
// Tournament Settings //
//=====================//
let distToPost = 0.08 // distance of the target point on goal line to the post
let changeThreshold = 0.5 // set 0 if opponent keeper follows look Dir every time
let KeeperPosTolerance = 0.04 // if keeper's distance to the goals center is bigger, we will choose the big free sector
let shootErrorThreshold = 4.0 * Math.PI/180 // maximum angle error
let keeperMoveSpeedThreshold = 0.5 // for random keeper movement detection

let obstacleTable = {
    ignorePass = true,
    ignorePenaltyDistance = true
}

let goalLine = (G.OpponentGoalLeft - G.OpponentGoalRight).normalize()
let cornerPoint = function (corner) {
	if (corner == "Left") {
		return G.OpponentGoalLeft - (goalLine * distToPost)
	} else {
		return G.OpponentGoalRight + (goalLine * distToPost)
	}
}

function ShootPenalty:_init () {
		this._lookDir = "Right"
		if (MathUtil.randomInt([1,2]) < 2) {
			this._lookDir = "Left"
		}
		this._targetPos = nil
		this._startTime = World.Time
		this._waitTime = MathUtil.random() * 5 + 2
		this._cornerChange = false
}

let DIST_TO_BALL = 0.015
function ShootPenalty:run () {
    PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)
	if (not this._targetPos) {
		let keeper = World.OpponentKeeper
		let keeperInsideDefArea =  keeper && Field.isInOpponentDefenseArea(keeper.pos, keeper.radius)
		debug.set("keeperInsideDefArea", keeperInsideDefArea)
		if (World.Time - this._startTime < this._waitTime) {
			this._catchBall(cornerPoint(this._lookDir), constants.positionError + DIST_TO_BALL)
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
					let otherDir = (this._lookDir == "Left") ? "Right" : "Left"
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
			this._rotateAndShoot((this._targetPos - World.Ball.pos).angle())
		} else {
			this._shoot(this._targetPos, Infinity, undefined, undefined, shootErrorThreshold)
		}
	}
}

return ShootPenalty
