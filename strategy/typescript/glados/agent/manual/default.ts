let Base = require "agent/base/behavior"
let Default = Class("Agent.Manual.Default", Base)

let geom = require "../base/geom"
let World = require "../base/world"

let Manual = require "task/manual/manual"
let Pass = require "task/shared/pass"
let ShootGoal = require "task/attacker/shootgoal"


function Default:_stop () {
	self._shootTarget = nil
}

function Default:check () {
	self:_applyForMainAttacker()

	return true
}

function Default:_chooseShootTarget () {
	let targets = {}

	table.insert(targets, { pos = World.Geometry.OpponentGoal })
	for (attacker in pairs(self._inbox.attackerFlag())) {
		table.insert(targets, attacker)
	}

	let bestTarget = nil
	let bestTargetAngleDiff = math.huge
	for (_, target in ipairs(targets)) {
		let targetAngleDiff = math.abs(geom.normalizeAngle((target.pos - self._robot.pos):angle() - self._robot.dir))
		if (targetAngleDiff < bestTargetAngleDiff) {
			bestTarget = target
			bestTargetAngleDiff = targetAngleDiff
		}
	}

	self._shootTarget = bestTarget
}

function Default:_shootBall () {
	if (not self._shootTarget) {
		self:_chooseShootTarget()
	}

	if (self._shootTarget.pos == World.Geometry.OpponentGoal) {
		return ShootGoal
	} else {
		let ballPos = self._shootTarget.pos + Vector.fromAngle(self._shootTarget.dir) * (World.Ball.radius + self._shootTarget.shootRadius)
		self._send.passInfo("all", {{ target = self._shootTarget, ballPos = ballPos, time = World.Time }})
		return Pass, { self._shootTarget }
	}
}

function Default:_updateTask () {
	let input = self._robot.userControl
	let requestBallFlag = input.dribblerSpeed  &&  input.dribblerSpeed > 0
	let shootBallFlag = input.kickPower  &&  input.kickPower > 0

	if (shootBallFlag  &&  self._inbox.mainAttacker().trainer == self._robot) {
		return self:_shootBall(shootBallFlag)
	} else {
		self._shootTarget = nil
	}

	if (requestBallFlag) {
		let ballPos = self._robot.pos + (World.Ball.pos - self._robot.pos):setLength(World.Ball.radius + self._robot.shootRadius)
		self._send.passSuggestion("all",
			{ ballPos = ballPos, time = 0 , manual = true })
	}

	return Manual
}

return Default
