let Base = require "agent/base/behavior"
let FreeKick = Class("Agent.Attacker.FreeKick", Base)

import * as debug from "base/debug";
import * as Field from "base/field";
import * as geom from "base/geom";
import * as Referee from "base/referee";
import * as World from "base/world";
import * as Robot from "glados/observer/robot";
import * as Shoot from "glados/observer/shoot";

let MoveToStaticBall = require "task/attacker/movetostaticball"
import {Pass} from "glados/task/shared/pass";
import {ShootGoal} from "glados/task/attacker/shootgoal";
import * as Attack from "glados/util/attack";
let ShootGoalUtil = require "util/shootgoal"


function FreeKick:_stop () {
	this._startTime = 0
	this._state = "prepare"
	this._dirty = false
	this._passList = nil
	this._pass = nil
	this._waitStartTime = nil
	this._redeciding = false
}

function FreeKick:start () {
	this._startTime = World.Time
}

function FreeKick:check () {
	// we have to be main attacker
	if (this._inbox.mainAttacker().trainer != this._robot) {
		return false
	}

	if (Referee.isFriendlyFreeKickState()) {
		this._forceKeepingInPool = true
		return true
	}

	// stay active for one additional frame to avoid flickering to a different task
	// rely on being killed by applyForMainAttacker
	if (Robot.ownStandardShooter() == this._robot) {
		return true
	}

	return false
}

function FreeKick:_updateTask () {
	let prevState = this._state

	let ballDefenseDist = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0)
	let distanceToBall = Math.max(0.01, Math.min(0.15, ballDefenseDist - 2*this._robot.radius - World.Ball.radius - 0.04))
	let nearBall = this._robot.pos.distanceTo(World.Ball.pos)
		< distanceToBall + this._robot.radius + World.Ball.radius + 0.02

	let _; _, _, this._dirty = ShootGoalUtil.updateTarget(this._robot, undefined, this._dirty, World.Ball.pos)
	let shootgoalPossible = not this._dirty && World.Ball.pos.y > -0.2  &&
		(World.RefereeState == "DirectOffensive" || World.RefereeState == "KickoffOffensive")

	// prepare -> wait
	if (this._state == "prepare" && nearBall) {
		this._state = "wait"
		this._waitStartTime = World.Time
	}

	// wait -> shootgoal
	// wait -> pass_prepare
	let MIN_WAIT_TIME = 1.5
	let MAX_TIMEFRAME = 8
	let timeRunningOut = World.Time - Referee.lastStateChangeTime() >= MAX_TIMEFRAME
	if (this._state == "wait") {
		if (shootgoalPossible) {
			this._state = "shootgoal"
			this._passList = nil
		} else if (timeRunningOut && Referee.isFriendlyFreeKickState()) {
			this._state = "shootgoal"
		} else if (World.Time - this._waitStartTime > MIN_WAIT_TIME) {
			this._passList = Attack.sortPassesFromSuggestions(this._robot, this._inbox.passSuggestion(), undefined, false)
			if (this._passList) {
				let _; _, this._pass = next(this._passList)
				if (this._pass) {
					this._state = "pass_prepare"
					// make sure that timing is not an issue for the strikers
					this._pass.time = this._pass.time + 1.5
				}
			}
		}
	}

	//check for anonymous pass
	let restartTask = this._redeciding
	if (this._state == "pass_prepare" || this._state == "pass") {
		if (not this._pass.target) {
			// try to find the target
			// look for a suggestion that matches our pass
			let passes = Attack.sortPassesFromSuggestions(this._robot, this._inbox.passSuggestion(), undefined, false, 0)
			if (passes) {
				for (_,pass in ipairs(passes)) {
					if (pass.target && pass.ballPos.distanceTo(this._pass.ballPos) < 0.1) {
						this._pass.target = pass.target
						if (this._state == "pass") {
							restartTask = true
						}
					}
				}
			}
		}
	}

	if ((this._state == "pass_prepare" || this._state == "pass" && this._pass.time - World.Time > 0.5) && not timeRunningOut) {
		let suggestion = this._inbox.passSuggestion()[this._pass.target]
		if (suggestion && suggestion.ballPos.distanceTo(this._pass.ballPos) < 0.01) {
			let bufferTime = 0.1
			if (suggestion.time - this._pass.time > bufferTime * 0.5) {
				this._pass.time = suggestion.time + bufferTime
				restartTask = true
			}
		}
	}

	if (this._state == "pass" && timeRunningOut) {
		this._state = "wait"
	}

	// pass_prepare -> pass
	if (this._state == "pass_prepare") {
		let shootPos = this._pass.ballPos
		let ballTime = Shoot.ballPassTime(World.Ball.pos, shootPos, this._pass.target, undefined, this._robot)
		let extraTime = Math.abs(Math.abs(geom.getAngleDiff(this._robot.dir, (shootPos - this._robot.pos).angle()))) / Math.PI * 1.3 + 0.2
		let robotTime = Robot.minShootTime(this._robot, shootPos) + extraTime
		if (World.Time + robotTime + ballTime >= this._pass.time) {
			this._state = "pass"
		}

		// redecide if beneficial
		let enoughTime = World.Time - Referee.lastStateChangeTime() <= 5
		if (enoughTime) {
			let hysteresis = 0.05
			let newPass = Attack.choosePassFromSuggestions(this._robot, this._inbox.passSuggestion(),
					this._pass.ballPos, false, hysteresis)
			if (newPass && newPass.ballPos.distanceTo(this._pass.ballPos) > 0.2) {
				this._state = "wait" // wait state will deal with setting up a new pass
			}
		}
	}

	// delay the pass if the receiver is not ready yet
	if (this._state == "pass") {
		let passSuggestion = this._inbox.passSuggestion()[this._pass.target]
		if (passSuggestion && passSuggestion.ballPos == this._pass.ballPos) {
			if (this._pass.time < passSuggestion.time) {
				this._pass.time = passSuggestion.time
			}
		}
	}


	if (this._passList && this._state == "pass") {
		this._send.passInfo("all", {this._pass})
	} else if (this._passList) {
		this._send.passInfo("all", this._passList)
	}

	// visualize decision
	let visTarget
	if (this._pass) {
		visTarget = this._pass.ballPos
	} else if (this._state == "shootgoal") {
		visTarget = World.Geometry.OpponentGoal
	}
	if (visTarget) {
		Attack.visualizeAttack(this._robot.pos, visTarget)
	}



	debug.set("state", this._state)
	let stateChanged = prevState == this._state

	if (this._pass) {
		debug.push("pass", this._pass.target ? this._pass.target.id : "anonymous")
		debug.set("ballPos", this._pass.ballPos)
		debug.set("time (rel)", this._pass.time - World.Time)
		debug.set("time (abs)", this._pass.time)
		debug.set("chip", this._pass.chip)
		debug.pop()
	} else {
		debug.set("pass", undefined)
	}

	let PASS_TIMEFRAME = 4
	if (this._state == "prepare") {
		this._send.attackTime("all", Referee.lastStateChangeTime() + PASS_TIMEFRAME)
		return MoveToStaticBall, { Math.PI / 2, distanceToBall }, stateChanged
	} else if (this._state == "shootgoal") {
		return ShootGoal
	} else if (this._state == "wait" || this._state == "pass_prepare") {
		this._send.attackTime("all", Referee.lastStateChangeTime() + PASS_TIMEFRAME)
		return MoveToStaticBall, { Math.PI / 2 }, stateChanged
	} else if (this._state == "pass") {
		if (this._task && Class.instanceOf(this._task, Pass)) {
			this._task:updateTarget(this._pass.target, this._pass.ballPos, undefined, this._pass.time)
		}
		return Pass, { this._pass.target, this._pass.ballPos, this._pass.chip, World.Ball.pos, this._pass.time }, restartTask
	}
}

return FreeKick
