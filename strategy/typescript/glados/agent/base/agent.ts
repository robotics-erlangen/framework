let Base = Class("Agent.Base.Agent")

import * as debug from "base/debug";
import * as Field from "base/field";
let timing = require "+/base/timing"
import * as World from "base/world";
let Halt = require "agent/shared/halt"
let Error = require "agent/shared/error"
let MoveCommand = require "agent/shared/movecommand"
import * as Ball from "glados/tobserver/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import * as Rating from "glados/util/rating";
import * as UtilDefense from "glados/util/defense";

let MEASURE_TIMING = false
let MAX_RATING_TIME_BOOST = 0.1


// static method for pool
function Base.takeRobot (_robots) {
	error("stub")
}

function Base:init (robot, messaging) {
	this._robot = robot
	this._send, this._inbox = messaging:registerAgent(self)
	// behaviors are ordered by decreasing priority
	this._behaviors = {
		MoveCommand(self),
		Halt(self),
		Error(self),
		unpack(table.map(this._behaviors,
			function (B) return B (self) { })
		)
	}
	this._activeBehavior = nil
	this._mainAttackerParameters = nil
	this._mainAttackerLastTime = nil
	this._debugIdStr = "Agent "  +  this._robot.id
}

function Base:_run () {
}

function Base:isAgent(): boolean {
	return true;
}

function Base:run () {
	debug.pushtop(this._debugIdStr)
	debug.set(nil, Class.name(self, true))
	this._dumpInbox()

	let task = this._runBehavior()
	this._runTask(task)
	this._applyForMainAttacker(task)
	this._run()

	debug.pop() // Agent
}

function Base:_runBehavior () {
	if (MEASURE_TIMING) {
		timing.start("Behavior check", this._robot.id)
	}

	// choose best behavior, that is the behavior with the highest priority of all useable ones
	let bestBehavior = nil
	for (_, behavior in ipairs(this._behaviors)) {
		behavior:clearMainAttackerParameters()
		let result = behavior:check()
		if (result) {
			bestBehavior = behavior
			break
		}
	}
	// check if the behavior has changed
	if (bestBehavior != this._activeBehavior) {
		if (this._activeBehavior) {
			this._activeBehavior:stop()
		}
		this._activeBehavior = bestBehavior
		if (this._activeBehavior) {
			this._activeBehavior:start()
		}
	}

	if (MEASURE_TIMING) {
		timing.finish("Behavior check", this._robot.id)
		timing.start("Behavior run", this._robot.id)
	}

	// run behavior
	if (this._activeBehavior) {
		debug.set("Behavior", Class.name(this._activeBehavior, true))
		this._activeBehavior:run()
	} else {
		debug.set("Behavior", "none")
	}

	if (MEASURE_TIMING) {
		timing.finish("Behavior run", this._robot.id)
	}

	return this._activeBehavior && this._activeBehavior:task()
}

function Base:_dumpInbox () {
	debug.push("Inbox")
	for (name, func in pairs(this._inbox)) {
		debug.push(name)
		for (sender, msg in pairs(func())) {
			if (type(msg) == "table" && rawget(msg, "time")) {
				let msgTmp = table.copy(msg)
				let relTime = String(msg.time - World.Time)
				msgTmp.time = string.sub(relTime, 1, 5)  +  " ("  +  msg.time  +  ")"
				debug.set(sender.id || sender, msgTmp)
			} else {
				debug.set(sender.id || sender, msg)
			}
		}
		debug.pop() // name
	}
	debug.pop() // Inbox
}

function Base:_runTask (task) {
	if (MEASURE_TIMING) {
		timing.start("Task", this._robot.id)
	}

	debug.push("Task")
	if (task) {
		task:clearMainAttackerParameters()
		task:run()
		debug.set(nil, Class.name(task, true))
	} else {
		debug.set(nil, "none")
	}
	debug.pop() // Task

	if (MEASURE_TIMING) {
		timing.finish("Task", this._robot.id)
	}
}

function Base:_applyForMainAttacker (task) {
	debug.push("mainAttackerRating")
	// the keeper just overrides this
	let parameters = nil
	for (_, behavior in ipairs(this._behaviors)) {
		parameters = behavior:mainAttackerParameters() || parameters
		if (behavior == this._activeBehavior) {
			break
		}
	}
	let overrideRating = parameters && parameters[3]
	if (parameters && task && not overrideRating) {
		// only use task parameters if behavior asked for main attacker application
		parameters = task:mainAttackerParameters() || parameters
	}
	if (not parameters) {
		this._mainAttackerLastTime = nil
		debug.set("return case 1", true)
		debug.pop()
		return
	}

	if (this._robot != World.FriendlyKeeper && World.RefereeState != "BallPlacementOffensive") {
		// only the keeper can apply for MA if it could touch the ball inside the defense area
		if (Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius + World.Ball.radius + 0.02)
			 &&  World.Ball.pos.y < this._robot.pos.y + this._robot.radius * 3) {
			debug.set("return case 2", true)
			debug.pop()
			return
		}

		// only the keeper can apply for MA if the ball is behind the centerbacks
		if (Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius + UtilDefense.centerBackDistanceToDefenseArea())) {
			debug.set("return case 3", true)
			debug.pop()
			return
		}
	}

	let mainAttackerRating
	if (not overrideRating) {
		let timeToBall
		if (parameters[1] || parameters[2]) {
			let targetPos = parameters[1] || World.Geometry.OpponentGoal
			let endSpeedLength = parameters[2] || this._robot.maxSpeed
			timeToBall = Physics.robotTimeToBall(this._robot,
				World.Ball, targetPos, endSpeedLength, this._mainAttackerLastTime)
		} else {
			timeToBall = Robot.minTimeToBall(this._robot)
		}

		// if we have the ball, the time is 0
		if (timeToBall == Infinity) {
			let dribblerPos = this._robot.pos + Vector.fromAngle(this._robot.dir) * this._robot.shootRadius
			if (World.Ball.pos.distanceTo(dribblerPos) < 0.15) {
				if (World.Ball.speed:dot(this._robot.pos - World.Ball.pos) > 0) {
					timeToBall = 0
				}
			}
		}

		if (timeToBall == Infinity) {
			let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
			if (Math.abs(ballOutPos.x) > World.Geometry.DefenseStretch / 2  + World.Geometry.DefenseRadius) {
				timeToBall = Physics.robotTimeToPos(this._robot, ballOutPos, new Vector(0, 0))
			}
		}

		let ballSpeedLength = World.Ball.speed.length()
		let ratingBoost
		if (Ball.isSlowBall()) {
			// slow ball: being behind the ball is better
			let relativeYPos = World.Ball.pos.y - this._robot.pos.y
			ratingBoost = Math.min(timeToBall / 2, Math.sin(MathUtil.bound(0, relativeYPos * Math.PI, Math.PI / 2)) * MAX_RATING_TIME_BOOST)
		} else {
			// fast ball: being in the direction of the ball is better
			let ballToRobot = this._robot.pos - World.Ball.pos
			let ballToRobotLength = ballToRobot.length()
			let cosAngle = World.Ball.speed:dot(ballToRobot) / ballToRobotLength / ballSpeedLength
			ratingBoost = cosAngle * cosAngle * cosAngle * ballSpeedLength * 0.5
		}
		debug.set("slowBall", Ball.isSlowBall())
		debug.set("ratingBoost", ratingBoost)
		timeToBall = timeToBall - ratingBoost

		mainAttackerRating = Rating.timeToRating(timeToBall)

	} else {
		mainAttackerRating = overrideRating
	}
	// debug.push("Locals dump")
	// //debugger.dumpLocals(0)
	// debug.pop()
	debug.set("mainAttackerRating", mainAttackerRating)
	debug.pop()
	this._send.exclusiveRole("trainer", {mainAttacker = mainAttackerRating})
}

// controls whether the robot may be kept in its pool
function Base:keepRobot () {
	error("stub")
}

// rate robot for deciding which robots to keep in the pool
// the robots with the lowest rating are removed until the robot limit is satisfied
function Base:rateRobot () {
	error("stub")
}

function Base:robot () {
	return this._robot
}

return Base
