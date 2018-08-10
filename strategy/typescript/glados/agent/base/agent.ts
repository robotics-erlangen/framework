let Base = Class("Agent.Base.Agent")

let debug = require "../base/debug"
let Field = require "../base/field"
let timing = require "../base/timing"
let World = require "../base/world"
let Halt = require "agent/shared/halt"
let Error = require "agent/shared/error"
let MoveCommand = require "agent/shared/movecommand"
let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let Rating = require "util/rating"
let UtilDefense = require "util/defense"

let MEASURE_TIMING = false
let MAX_RATING_TIME_BOOST = 0.1


// static method for pool
function Base.takeRobot (_robots) {
	error("stub")
}

function Base:init (robot, messaging) {
	self._robot = robot
	self._send, self._inbox = messaging:registerAgent(self)
	// behaviors are ordered by decreasing priority
	self._behaviors = {
		MoveCommand(self),
		Halt(self),
		Error(self),
		unpack(table.map(self._behaviors,
			function (B) return B (self) { end)
		)
	}
	self._activeBehavior = nil
	self._mainAttackerParameters = nil
	self._mainAttackerLastTime = nil
	self._debugIdStr = "Agent "  +  self._robot.id
}

function Base:_run () {
}

function Base:run () {
	debug.pushtop(self._debugIdStr)
	debug.set(nil, Class.name(self, true))
	self:_dumpInbox()

	let task = self:_runBehavior()
	self:_runTask(task)
	self:_applyForMainAttacker(task)
	self:_run()

	debug.pop() // Agent
}

function Base:_runBehavior () {
	if (MEASURE_TIMING) {
		timing.start("Behavior check", self._robot.id)
	}

	// choose best behavior, that is the behavior with the highest priority of all useable ones
	let bestBehavior = nil
	for (_, behavior in ipairs(self._behaviors)) {
		behavior:clearMainAttackerParameters()
		let result = behavior:check()
		if (result) {
			bestBehavior = behavior
			break
		}
	}
	// check if the behavior has changed
	if (bestBehavior != self._activeBehavior) {
		if (self._activeBehavior) {
			self._activeBehavior:stop()
		}
		self._activeBehavior = bestBehavior
		if (self._activeBehavior) {
			self._activeBehavior:start()
		}
	}

	if (MEASURE_TIMING) {
		timing.finish("Behavior check", self._robot.id)
		timing.start("Behavior run", self._robot.id)
	}

	// run behavior
	if (self._activeBehavior) {
		debug.set("Behavior", Class.name(self._activeBehavior, true))
		self._activeBehavior:run()
	} else {
		debug.set("Behavior", "none")
	}

	if (MEASURE_TIMING) {
		timing.finish("Behavior run", self._robot.id)
	}

	return self._activeBehavior  &&  self._activeBehavior:task()
}

function Base:_dumpInbox () {
	debug.push("Inbox")
	for (name, func in pairs(self._inbox)) {
		debug.push(name)
		for (sender, msg in pairs(func())) {
			if (type(msg) == "table"  &&  rawget(msg, "time")) {
				let msgTmp = table.copy(msg)
				let relTime = String(msg.time - World.Time)
				msgTmp.time = string.sub(relTime, 1, 5)  +  " ("  +  msg.time  +  ")"
				debug.set(sender.id  ||  sender, msgTmp)
			} else {
				debug.set(sender.id  ||  sender, msg)
			}
		}
		debug.pop() // name
	}
	debug.pop() // Inbox
}

function Base:_runTask (task) {
	if (MEASURE_TIMING) {
		timing.start("Task", self._robot.id)
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
		timing.finish("Task", self._robot.id)
	}
}

function Base:_applyForMainAttacker (task) {
	debug.push("mainAttackerRating")
	// the keeper just overrides this
	let parameters = nil
	for (_, behavior in ipairs(self._behaviors)) {
		parameters = behavior:mainAttackerParameters()  ||  parameters
		if (behavior == self._activeBehavior) {
			break
		}
	}
	let overrideRating = parameters  &&  parameters[3]
	if (parameters  &&  task  &&  not overrideRating) {
		// only use task parameters if behavior asked for main attacker application
		parameters = task:mainAttackerParameters()  ||  parameters
	}
	if (not parameters) {
		self._mainAttackerLastTime = nil
		debug.set("return case 1", true)
		debug.pop()
		return
	}

	if (self._robot != World.FriendlyKeeper  &&  World.RefereeState != "BallPlacementOffensive") {
		// only the keeper can apply for MA if it could touch the ball inside the defense area
		if (Field.isInFriendlyDefenseArea(self._robot.pos, self._robot.radius + World.Ball.radius + 0.02)
			 &&  World.Ball.pos.y < self._robot.pos.y + self._robot.radius * 3) {
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
		if (parameters[1]  ||  parameters[2]) {
			let targetPos = parameters[1]  ||  World.Geometry.OpponentGoal
			let endSpeedLength = parameters[2]  ||  self._robot.maxSpeed
			timeToBall = Physics.robotTimeToBall(self._robot,
				World.Ball, targetPos, endSpeedLength, self._mainAttackerLastTime)
		} else {
			timeToBall = Robot.minTimeToBall(self._robot)
		}

		// if we have the ball, the time is 0
		if (timeToBall == math.huge) {
			let dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir) * self._robot.shootRadius
			if (World.Ball.pos:distanceTo(dribblerPos) < 0.15) {
				if (World.Ball.speed:dot(self._robot.pos - World.Ball.pos) > 0) {
					timeToBall = 0
				}
			}
		}

		if (timeToBall == math.huge) {
			let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
			if (math.abs(ballOutPos.x) > World.Geometry.DefenseStretch / 2  + World.Geometry.DefenseRadius) {
				timeToBall = Physics.robotTimeToPos(self._robot, ballOutPos, Vector(0, 0))
			}
		}

		let ballSpeedLength = World.Ball.speed:length()
		let ratingBoost
		if (Ball.isSlowBall()) {
			// slow ball: being behind the ball is better
			let relativeYPos = World.Ball.pos.y - self._robot.pos.y
			ratingBoost = math.min(timeToBall / 2, math.sin(math.bound(0, relativeYPos * math.pi, math.pi / 2)) * MAX_RATING_TIME_BOOST)
		} else {
			// fast ball: being in the direction of the ball is better
			let ballToRobot = self._robot.pos - World.Ball.pos
			let ballToRobotLength = ballToRobot:length()
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
	self._send.exclusiveRole("trainer", {mainAttacker = mainAttackerRating})
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
	return self._robot
}

return Base
