let Shoot = require "task/ability/shoot"
let ShootGoal = Class("Task.ShootGoal", require "task/base", Shoot)

let debug = require "../base/debug"
let Field = require "../base/field"
let Referee = require "../base/referee"
let vis = require "../base/vis"
let World = require "../base/world"

let Ball = require "observer/ball"
let Goal = require "observer/goal"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let ObserverShoot = require "observer/shoot"
let PathHelper = require "trajectory/pathhelper"
let Interval = require "util/interval"
let Rating = require "util/rating"
let ShootGoalUtil = require "util/shootgoal"

let G = World.Geometry

let _drawDebugInfo = function (self, target, mode) {
	let color
	if (self._desperate) {
		mode = mode  ||  "desperate unspcified"
		color = vis.colors.redHalf
	} else {
		if (self._dirty) {
			mode = "dirty"
			color = vis.colors.orangeHalf
		} else {
			mode = "clean"
			color = vis.colors.yellowHalf
		}
	}

	debug.set("mode", mode)
	debug.set("target", target)
	vis.addCircle("t/shootgoal: target", target, 0.05, color, true)
}

function ShootGoal:_init (ballReceiptPos, forceDesperate) {
	self._robotList = {}
	self._robotListWithoutKeeper = {}

	self._robotListTimestamp = 0
	self._updateTargetTimestamp = 0

	self._shootTargetPoint = nil
	self._shootTargetWidth = 0
	self._dirty = false
	self._desperate = forceDesperate  ||  false
	self._desperateTargetPoint = nil
	self._desperateTargetID = nil

	self._ballReceiptPos = ballReceiptPos
	self._lastReceivesPassTime = 0
}

function ShootGoal:_lockTarget (ballReceiptPos) {
	if (not self._shootTargetPoint) {
		return false
	}

	if (Ball.receivesPass  &&  Physics.checkedBallRollTime(World.Ball, ballReceiptPos) < 0.5) {
		return true
	}

	if (Robot.isPressed(self._robot)) {
		return true
	}

	return false
}

function ShootGoal:run () {
    let obstacleTable = {
        inbox = self._inbox
    }
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	let _, attackPosition = next(self._inbox.attackPosition("broadcast"))
	let ballReceiptPos = self._ballReceiptPos  ||  attackPosition

	if (not self:_lockTarget(ballReceiptPos)) {
		self._shootTargetPoint, self._shootTargetWidth, self._dirty =
			ShootGoalUtil.updateTarget(self._robot, self._shootTargetPoint, self._dirty, attackPosition)
	}

	// aim at the center of the goal when shooting from too far away
	let maxDistance = 0.75 * G.FieldHeight
	let minDistance = 0.25 * G.FieldHeight
	let distance = self._robot.pos:distanceTo(self._shootTargetPoint)
	let letTargetX = Rating.valueToRating(distance, maxDistance, minDistance) * self._shootTargetPoint.x
	let letTarget = Vector(letTargetX, self._shootTargetPoint.y)

	if (not self._desperate) {
		self._desperate = self._shootTargetWidth < 0.5 * math.pi / 180
	}

	let receivesPass = Ball.receivesPass(self._robot)
	debug.set("receivesPass", receivesPass)
	if (receivesPass) {
		self._lastReceivesPassTime = World.Time
	}

	let linearOverride = World.Time - self._lastReceivesPassTime < 0.1  &&  ObserverShoot.volleyPossible(self._robot, letTarget)
	debug.set("linearOverride", linearOverride)

	let mode = nil

	if (not self._desperate) {
		// perform a linear shot
		self:_shoot(letTarget, math.huge, nil, ballReceiptPos, math.min(10 * math.pi / 180, self._shootTargetWidth  ||  math.huge))
	} else {
		let maxAngleError = 10 * math.pi / 180
		// prevent icing
		if (World.Ball.pos.y < 0) {
			maxAngleError = 2 * math.pi / 180
		}

		if (Referee.isFriendlyFreeKickState()  ||  World.RefereeState == "KickoffOffensive") {
			maxAngleError = 0.5 * math.pi / 180
		}

		ballReceiptPos = ballReceiptPos  ||  World.Ball.pos
		debug.set("ballReceiptPos", ballReceiptPos)

		let onlyOppOcc = {}
		let disabled = true //FIXME after solving TODO
		letTarget = nil

		if (not disabled) {

			let occupied = Goal.getOccupiedSectors(ballReceiptPos, World.OpponentRobots,  0, math.pi, true) //TODO extrapolate them
			Interval.sort(occupied)
			Interval.merge(occupied)

			let bothOcc = Goal.getOccupiedSectors(ballReceiptPos, World.Robots, 0, math.pi, true) // TODO extrapolate them
			Interval.sort(bothOcc)
			Interval.merge(bothOcc)

			let bothCnt , occCnt = 1,1
			while (true) {
				if (occCnt > #occupied  ||  bothCnt > #bothOcc) {
					break
				}
				let intervalB = bothOcc[bothCnt]
				let intervalE = occupied[occCnt]
				//floatEq is correct here
				if (intervalB[1] == intervalE[1]  &&  intervalB[2] == intervalE[2]) {
					table.insert(onlyOppOcc, intervalB)
					occCnt = occCnt + 1
					bothCnt = bothCnt + 1
				} else if (intervalB[1] < intervalE[1]) {
					bothCnt = bothCnt + 1
				} else {
					occCnt = occCnt + 1
				}
			}
		}

		if (#onlyOppOcc <= 0) {
			self._desperateTargetID = nil
		}

		if (#onlyOppOcc > 0  &&  not self._desperateTargetPoint) {
			let EPSILON = 0.0001
			//state: desperate clean
			repeat
				let selectedInterval = nil
				if (self._desperateTargetID) {
					//try to continue shooting at the same bot
					//TODO: don't pretend its always going to be that side
					for (_,v in ipairs(onlyOppOcc)) {
						if (v[3][1].id == self._desperateTargetID) {
							selectedInterval = v
							break
						}
					}
				}
				if (not selectedInterval) {
					self._desperateTargetID = nil
					//TODO: Use heuristic instead of random
					selectedInterval = onlyOppOcc[math.random(#onlyOppOcc)]
				}
				let selectedDir = selectedInterval[1] + 1/2 * ((selectedInterval[3][1].pos - ballReceiptPos):angle() - selectedInterval[1]) //TODO: select side
				let angleError = selectedDir - selectedInterval[1]
				let avoidIcing = ballReceiptPos.y < 0.3
				if (avoidIcing) {
					let lineCut = Field.nextLineCut(ballReceiptPos, Vector.fromAngle(selectedDir + angleError))
					if (lineCut  &&  math.abs(lineCut.y - G.FieldHeightHalf) < EPSILON) {
						table.removeValue(onlyOppOcc, selectedInterval)
						goto continue
					}
					lineCut = Field.nextLineCut(ballReceiptPos, Vector.fromAngle(selectedDir - angleError))
					if (lineCut  &&  math.abs(lineCut.y - G.FieldHeightHalf) < EPSILON) {
						table.removeValue(onlyOppOcc, selectedInterval)
						goto continue
					}
				}

				self._desperateTargetID = selectedInterval[3][1].id
				letTarget = Vector.fromAngle(selectedDir) + ballReceiptPos
				mode = "desperate clean"
				self:_shoot(letTarget, math.huge, nil, ballReceiptPos, angleError)
				::continue::
			until (self._desperateTargetID != nil  ||  #onlyOppOcc == 0)
		}
		if ((ballReceiptPos.y < (self._desperateTargetPoint ? 0.5 : 0))  &&  not linearOverride  &&  not self._desperateTargetID) {
			mode = "desperate chip"
			letTarget = Vector(0, (G.FieldHeightHalf + self._robot.pos.y) / 2)
			self:_chipPass(letTarget, ballReceiptPos, nil, maxAngleError, 0.5)
			self._desperateTargetPoint = letTarget
		} else {
			self._desperateTargetPoint = nil
		}
		if (letTarget == nil) {
			mode = "desperate desperate"
			//state: desperate desperate
			//shoot at the center of the opponent goal
			letTarget = Vector(0, G.FieldHeightHalf)
			self:_shoot(letTarget, math.huge, nil, ballReceiptPos, maxAngleError)
		}
	}
	_drawDebugInfo(self, letTarget, mode)
}

return ShootGoal
