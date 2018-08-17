let Shoot = require "task/ability/shoot"
let ShootGoal = Class("Task.ShootGoal", require "task/base", Shoot)

import * as debug from "base/debug";
import * as Field from "base/field";
import * as Referee from "base/referee";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Ball from "glados/tobserver/ball";
import * as Goal from "glados/observer/goal";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
let ObserverShoot = require "observer/shoot"
import * as PathHelper from "glados/trajectory/pathhelper";
let Interval = require "util/interval"
import * as Rating from "glados/util/rating";
let ShootGoalUtil = require "util/shootgoal"

let G = World.Geometry

let _drawDebugInfo = function (self, target, mode) {
	let color
	if (this._desperate) {
		mode = mode || "desperate unspcified"
		color = vis.colors.redHalf
	} else {
		if (this._dirty) {
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
	this._robotList = {}
	this._robotListWithoutKeeper = {}

	this._robotListTimestamp = 0
	this._updateTargetTimestamp = 0

	this._shootTargetPoint = nil
	this._shootTargetWidth = 0
	this._dirty = false
	this._desperate = forceDesperate || false
	this._desperateTargetPoint = nil
	this._desperateTargetID = nil

	this._ballReceiptPos = ballReceiptPos
	this._lastReceivesPassTime = 0
}

function ShootGoal:_lockTarget (ballReceiptPos) {
	if (not this._shootTargetPoint) {
		return false
	}

	if (Ball.receivesPass && Physics.checkedBallRollTime(World.Ball, ballReceiptPos) < 0.5) {
		return true
	}

	if (Robot.isPressed(this._robot)) {
		return true
	}

	return false
}

function ShootGoal:run () {
    let obstacleTable = {
        inbox = this._inbox
    }
    PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, obstacleTable)

	let _, attackPosition = next(this._inbox.attackPosition("broadcast"))
	let ballReceiptPos = this._ballReceiptPos || attackPosition

	if (not this._lockTarget(ballReceiptPos)) {
		this._shootTargetPoint, this._shootTargetWidth, this._dirty =
			ShootGoalUtil.updateTarget(this._robot, this._shootTargetPoint, this._dirty, attackPosition)
	}

	// aim at the center of the goal when shooting from too far away
	let maxDistance = 0.75 * G.FieldHeight
	let minDistance = 0.25 * G.FieldHeight
	let distance = this._robot.pos.distanceTo(this._shootTargetPoint)
	let letTargetX = Rating.valueToRating(distance, maxDistance, minDistance) * this._shootTargetPoint.x
	let letTarget = new Vector(letTargetX, this._shootTargetPoint.y)

	if (not this._desperate) {
		this._desperate = this._shootTargetWidth < 0.5 * Math.PI / 180
	}

	let receivesPass = Ball.receivesPass(this._robot)
	debug.set("receivesPass", receivesPass)
	if (receivesPass) {
		this._lastReceivesPassTime = World.Time
	}

	let linearOverride = World.Time - this._lastReceivesPassTime < 0.1 && ObserverShoot.volleyPossible(this._robot, letTarget)
	debug.set("linearOverride", linearOverride)

	let mode = nil

	if (not this._desperate) {
		// perform a linear shot
		this._shoot(letTarget, Infinity, undefined, ballReceiptPos, Math.min(10 * Math.PI / 180, this._shootTargetWidth || Infinity))
	} else {
		let maxAngleError = 10 * Math.PI / 180
		// prevent icing
		if (World.Ball.pos.y < 0) {
			maxAngleError = 2 * Math.PI / 180
		}

		if (Referee.isFriendlyFreeKickState() || World.RefereeState == "KickoffOffensive") {
			maxAngleError = 0.5 * Math.PI / 180
		}

		ballReceiptPos = ballReceiptPos || World.Ball.pos
		debug.set("ballReceiptPos", ballReceiptPos)

		let onlyOppOcc = {}
		let disabled = true //FIXME after solving TODO
		letTarget = nil

		if (not disabled) {

			let occupied = Goal.getOccupiedSectors(ballReceiptPos, World.OpponentRobots,  0, Math.PI, true) //TODO extrapolate them
			Interval.sort(occupied)
			Interval.merge(occupied)

			let bothOcc = Goal.getOccupiedSectors(ballReceiptPos, World.Robots, 0, Math.PI, true) // TODO extrapolate them
			Interval.sort(bothOcc)
			Interval.merge(bothOcc)

			let bothCnt , occCnt = 1,1
			while (true) {
				if (occCnt > #occupied || bothCnt > #bothOcc) {
					break
				}
				let intervalB = bothOcc[bothCnt]
				let intervalE = occupied[occCnt]
				//floatEq is correct here
				if (intervalB[1] == intervalE[1] && intervalB[2] == intervalE[2]) {
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
			this._desperateTargetID = nil
		}

		if (#onlyOppOcc > 0 && not this._desperateTargetPoint) {
			let EPSILON = 0.0001
			//state: desperate clean
			repeat
				let selectedInterval = nil
				if (this._desperateTargetID) {
					//try to continue shooting at the same bot
					//TODO: don't pretend its always going to be that side
					for (_,v in ipairs(onlyOppOcc)) {
						if (v[3][1].id == this._desperateTargetID) {
							selectedInterval = v
							break
						}
					}
				}
				if (not selectedInterval) {
					this._desperateTargetID = nil
					//TODO: Use heuristic instead of random
					selectedInterval = onlyOppOcc[Math.random(#onlyOppOcc)]
				}
				let selectedDir = selectedInterval[1] + 1/2 * ((selectedInterval[3][1].pos - ballReceiptPos).angle() - selectedInterval[1]) //TODO: select side
				let angleError = selectedDir - selectedInterval[1]
				let avoidIcing = ballReceiptPos.y < 0.3
				if (avoidIcing) {
					let lineCut = Field.nextLineCut(ballReceiptPos, Vector.fromAngle(selectedDir + angleError))
					if (lineCut && Math.abs(lineCut.y - G.FieldHeightHalf) < EPSILON) {
						table.removeValue(onlyOppOcc, selectedInterval)
						continue;
					}
					lineCut = Field.nextLineCut(ballReceiptPos, Vector.fromAngle(selectedDir - angleError))
					if (lineCut && Math.abs(lineCut.y - G.FieldHeightHalf) < EPSILON) {
						table.removeValue(onlyOppOcc, selectedInterval)
						continue;
					}
				}

				this._desperateTargetID = selectedInterval[3][1].id
				letTarget = Vector.fromAngle(selectedDir) + ballReceiptPos
				mode = "desperate clean"
				this._shoot(letTarget, Infinity, undefined, ballReceiptPos, angleError)
				::continue::
			until (this._desperateTargetID != undefined || #onlyOppOcc == 0)
		}
		if ((ballReceiptPos.y < (this._desperateTargetPoint ? 0.5 : 0)) && not linearOverride && not this._desperateTargetID) {
			mode = "desperate chip"
			letTarget = new Vector(0, (G.FieldHeightHalf + this._robot.pos.y) / 2)
			this._chipPass(letTarget, ballReceiptPos, undefined, maxAngleError, 0.5)
			this._desperateTargetPoint = letTarget
		} else {
			this._desperateTargetPoint = nil
		}
		if (letTarget == undefined) {
			mode = "desperate desperate"
			//state: desperate desperate
			//shoot at the center of the opponent goal
			letTarget = new Vector(0, G.FieldHeightHalf)
			this._shoot(letTarget, Infinity, undefined, ballReceiptPos, maxAngleError)
		}
	}
	_drawDebugInfo(self, letTarget, mode)
}

return ShootGoal
