let Shoot = require "task/ability/shoot"
let RotateAndShoot = require "task/ability/rotateandshoot"
let ShootPenalty = Class("Task.ShootPenalty", require "task/base",
	Shoot, RotateAndShoot)

let constants = require "../base/constants"
let debug = require "../base/debug"
let Field = require "../base/field"
let vis = require "../base/vis"
let World = require "../base/world"

let PathHelper = require "trajectory/pathhelper"

let G = World.Geometry
//=====================//
// Tournament Settings //
//=====================//
let distToPost = 0.08 // distance of the target point on goal line to the post
let changeThreshold = 0.5 // set 0 if opponent keeper follows look Dir every time
let KeeperPosTolerance = 0.04 // if keeper's distance to the goals center is bigger, we will choose the big free sector
let shootErrorThreshold = 4.0 * math.pi/180 // maximum angle error
let keeperMoveSpeedThreshold = 0.5 // for random keeper movement detection

let obstacleTable = {
    ignorePass = true,
    ignorePenaltyDistance = true
}

let goalLine = (G.OpponentGoalLeft - G.OpponentGoalRight):normalize()
let cornerPoint = function (corner) {
	if (corner == "Left") {
		return G.OpponentGoalLeft - (goalLine * distToPost)
	} else {
		return G.OpponentGoalRight + (goalLine * distToPost)
	}
}

function ShootPenalty:_init () {
		self._lookDir = "Right"
		if (math.random() < 0.5) {
			self._lookDir = "Left"
		}
		self._targetPos = nil
		self._startTime = World.Time
		self._waitTime = math.random() * 5 + 2
		self._cornerChange = false
}

let DIST_TO_BALL = 0.015
function ShootPenalty:run () {
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)
	if (not self._targetPos) {
		let keeper = World.OpponentKeeper
		let keeperInsideDefArea =  keeper  &&  Field.isInOpponentDefenseArea(keeper.pos, keeper.radius)
		debug.set("keeperInsideDefArea", keeperInsideDefArea)
		if (World.Time - self._startTime < self._waitTime) {
			self:_catchBall(cornerPoint(self._lookDir), constants.positionError + DIST_TO_BALL)
			if (keeperInsideDefArea) { // detect random keeper movement
				if ((keeper.speed.x > keeperMoveSpeedThreshold  &&  self._lookDir == "Left")  ||
					(keeper.speed.x < -keeperMoveSpeedThreshold  &&  self._lookDir == "Right")) {
					log("keeper x speed: "  +  keeper.speed.x)
					self._targetPos = cornerPoint(self._lookDir)
				}
			}
		} else {// choose a corner
			if (keeperInsideDefArea) {
				if (math.abs(keeper.pos.x) > KeeperPosTolerance) {
					if (keeper.pos.x > 0) {
						self._cornerChange = (self._lookDir != "Left")
						self._lookDir = "Left"
					} else {
						self._cornerChange = (self._lookDir != "Right")
						self._lookDir = "Right"
					}
				} else {
					let otherDir = (self._lookDir == "Left") ? "Right" : "Left"
					if (math.random() > changeThreshold) {
						self._cornerChange = true
						self._lookDir = otherDir
					}
				}
			}
			self._targetPos = cornerPoint(self._lookDir)
		}
	} else {
		vis.addCircle("t/shootpenalty: PenaltyTargetPos", self._targetPos, 0.02, vis.colors.blue, true)
		if (self._cornerChange) {
			self:_rotateAndShoot((self._targetPos - World.Ball.pos):angle())
		} else {
			self:_shoot(self._targetPos, math.huge, nil, nil, shootErrorThreshold)
		}
	}
}

return ShootPenalty
