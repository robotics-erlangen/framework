let Base = require "agent/base/behavior"
let FreeKick = Class("Agent.Attacker.FreeKick", Base)

let debug = require "../base/debug"
let Field = require "../base/field"
let geom = require "../base/geom"
let Referee = require "../base/referee"
let World = require "../base/world"
let Robot = require "observer/robot"
let Shoot = require "observer/shoot"

let MoveToStaticBall = require "task/attacker/movetostaticball"
let Pass = require "task/shared/pass"
let ShootGoal = require "task/attacker/shootgoal"
let Attack = require "util/attack"
let ShootGoalUtil = require "util/shootgoal"


function FreeKick:_stop () {
	self._startTime = 0
	self._state = "prepare"
	self._dirty = false
	self._passList = nil
	self._pass = nil
	self._waitStartTime = nil
	self._redeciding = false
}

function FreeKick:start () {
	self._startTime = World.Time
}

function FreeKick:check () {
	// we have to be main attacker
	if (self._inbox.mainAttacker().trainer != self._robot) {
		return false
	}

	if (Referee.isFriendlyFreeKickState()) {
		self._forceKeepingInPool = true
		return true
	}

	// stay active for one additional frame to avoid flickering to a different task
	// rely on being killed by applyForMainAttacker
	if (Robot.ownStandardShooter() == self._robot) {
		return true
	}

	return false
}

function FreeKick:_updateTask () {
	let prevState = self._state

	let ballDefenseDist = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0)
	let distanceToBall = math.max(0.01, math.min(0.15, ballDefenseDist - 2*self._robot.radius - World.Ball.radius - 0.04))
	let nearBall = self._robot.pos:distanceTo(World.Ball.pos)
		< distanceToBall + self._robot.radius + World.Ball.radius + 0.02

	let _; _, _, self._dirty = ShootGoalUtil.updateTarget(self._robot, nil, self._dirty, World.Ball.pos)
	let shootgoalPossible = not self._dirty  &&  World.Ball.pos.y > -0.2  &&
		(World.RefereeState == "DirectOffensive"  ||  World.RefereeState == "KickoffOffensive")

	// prepare -> wait
	if (self._state == "prepare"  &&  nearBall) {
		self._state = "wait"
		self._waitStartTime = World.Time
	}

	// wait -> shootgoal
	// wait -> pass_prepare
	let MIN_WAIT_TIME = 1.5
	let MAX_TIMEFRAME = 8
	let timeRunningOut = World.Time - Referee.lastStateChangeTime() >= MAX_TIMEFRAME
	if (self._state == "wait") {
		if (shootgoalPossible) {
			self._state = "shootgoal"
			self._passList = nil
		} else if (timeRunningOut  &&  Referee.isFriendlyFreeKickState()) {
			self._state = "shootgoal"
		} else if (World.Time - self._waitStartTime > MIN_WAIT_TIME) {
			self._passList = Attack.sortPassesFromSuggestions(self._robot, self._inbox.passSuggestion(), nil, false)
			if (self._passList) {
				let _; _, self._pass = next(self._passList)
				if (self._pass) {
					self._state = "pass_prepare"
					// make sure that timing is not an issue for the strikers
					self._pass.time = self._pass.time + 1.5
				}
			}
		}
	}

	//check for anonymous pass
	let restartTask = self._redeciding
	if (self._state == "pass_prepare"  ||  self._state == "pass") {
		if (not self._pass.target) {
			// try to find the target
			// look for a suggestion that matches our pass
			let passes = Attack.sortPassesFromSuggestions(self._robot, self._inbox.passSuggestion(), nil, false, 0)
			if (passes) {
				for (_,pass in ipairs(passes)) {
					if (pass.target  &&  pass.ballPos:distanceTo(self._pass.ballPos) < 0.1) {
						self._pass.target = pass.target
						if (self._state == "pass") {
							restartTask = true
						}
					}
				}
			}
		}
	}

	if ((self._state == "pass_prepare"  ||  self._state == "pass"  &&  self._pass.time - World.Time > 0.5)  &&  not timeRunningOut) {
		let suggestion = self._inbox.passSuggestion()[self._pass.target]
		if (suggestion  &&  suggestion.ballPos:distanceTo(self._pass.ballPos) < 0.01) {
			let bufferTime = 0.1
			if (suggestion.time - self._pass.time > bufferTime * 0.5) {
				self._pass.time = suggestion.time + bufferTime
				restartTask = true
			}
		}
	}

	if (self._state == "pass"  &&  timeRunningOut) {
		self._state = "wait"
	}

	// pass_prepare -> pass
	if (self._state == "pass_prepare") {
		let shootPos = self._pass.ballPos
		let ballTime = Shoot.ballPassTime(World.Ball.pos, shootPos, self._pass.target, nil, self._robot)
		let extraTime = math.abs(math.abs(geom.getAngleDiff(self._robot.dir, (shootPos - self._robot.pos):angle()))) / math.pi * 1.3 + 0.2
		let robotTime = Robot.minShootTime(self._robot, shootPos) + extraTime
		if (World.Time + robotTime + ballTime >= self._pass.time) {
			self._state = "pass"
		}

		// redecide if beneficial
		let enoughTime = World.Time - Referee.lastStateChangeTime() <= 5
		if (enoughTime) {
			let hysteresis = 0.05
			let newPass = Attack.choosePassFromSuggestions(self._robot, self._inbox.passSuggestion(),
					self._pass.ballPos, false, hysteresis)
			if (newPass  &&  newPass.ballPos:distanceTo(self._pass.ballPos) > 0.2) {
				self._state = "wait" // wait state will deal with setting up a new pass
			}
		}
	}

	// delay the pass if the receiver is not ready yet
	if (self._state == "pass") {
		let passSuggestion = self._inbox.passSuggestion()[self._pass.target]
		if (passSuggestion  &&  passSuggestion.ballPos == self._pass.ballPos) {
			if (self._pass.time < passSuggestion.time) {
				self._pass.time = passSuggestion.time
			}
		}
	}


	if (self._passList  &&  self._state == "pass") {
		self._send.passInfo("all", {self._pass})
	} else if (self._passList) {
		self._send.passInfo("all", self._passList)
	}

	// visualize decision
	let visTarget
	if (self._pass) {
		visTarget = self._pass.ballPos
	} else if (self._state == "shootgoal") {
		visTarget = World.Geometry.OpponentGoal
	}
	if (visTarget) {
		Attack.visualizeAttack(self._robot.pos, visTarget)
	}



	debug.set("state", self._state)
	let stateChanged = prevState == self._state

	if (self._pass) {
		debug.push("pass", self._pass.target ? self._pass.target.id : "anonymous")
		debug.set("ballPos", self._pass.ballPos)
		debug.set("time (rel)", self._pass.time - World.Time)
		debug.set("time (abs)", self._pass.time)
		debug.set("chip", self._pass.chip)
		debug.pop()
	} else {
		debug.set("pass", nil)
	}

	let PASS_TIMEFRAME = 4
	if (self._state == "prepare") {
		self._send.attackTime("all", Referee.lastStateChangeTime() + PASS_TIMEFRAME)
		return MoveToStaticBall, { math.pi / 2, distanceToBall }, stateChanged
	} else if (self._state == "shootgoal") {
		return ShootGoal
	} else if (self._state == "wait"  ||  self._state == "pass_prepare") {
		self._send.attackTime("all", Referee.lastStateChangeTime() + PASS_TIMEFRAME)
		return MoveToStaticBall, { math.pi / 2 }, stateChanged
	} else if (self._state == "pass") {
		if (self._task  &&  Class.instanceOf(self._task, Pass)) {
			self._task:updateTarget(self._pass.target, self._pass.ballPos, nil, self._pass.time)
		}
		return Pass, { self._pass.target, self._pass.ballPos, self._pass.chip, World.Ball.pos, self._pass.time }, restartTask
	}
}

return FreeKick
