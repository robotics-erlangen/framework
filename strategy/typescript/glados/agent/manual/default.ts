let Base = require "agent/base/behavior"
let Default = Class("Agent.Manual.Default", Base)

import * as geom from "base/geom";
import * as World from "base/world";

let Manual = require "task/manual/manual"
import {Pass} from "glados/task/shared/pass";
import {ShootGoal} from "glados/task/attacker/shootgoal";


function Default:_stop () {
	this._shootTarget = nil
}

function Default:check () {
	this._applyForMainAttacker()

	return true
}

function Default:_chooseShootTarget () {
	let targets = {}

	table.insert(targets, { pos = World.Geometry.OpponentGoal })
	for (attacker in pairs(this._inbox.attackerFlag())) {
		table.insert(targets, attacker)
	}

	let bestTarget = nil
	let bestTargetAngleDiff = Infinity
	for (_, target in ipairs(targets)) {
		let targetAngleDiff = Math.abs(geom.normalizeAngle((target.pos - this._robot.pos).angle() - this._robot.dir))
		if (targetAngleDiff < bestTargetAngleDiff) {
			bestTarget = target
			bestTargetAngleDiff = targetAngleDiff
		}
	}

	this._shootTarget = bestTarget
}

function Default:_shootBall () {
	if (not this._shootTarget) {
		this._chooseShootTarget()
	}

	if (this._shootTarget.pos == World.Geometry.OpponentGoal) {
		return ShootGoal
	} else {
		let ballPos = this._shootTarget.pos + Vector.fromAngle(this._shootTarget.dir) * (World.Ball.radius + this._shootTarget.shootRadius)
		this._send.passInfo("all", {{ target = this._shootTarget, ballPos = ballPos, time = World.Time }})
		return Pass, { this._shootTarget }
	}
}

function Default:_updateTask () {
	let input = this._robot.userControl
	let requestBallFlag = input.dribblerSpeed && input.dribblerSpeed > 0
	let shootBallFlag = input.kickPower && input.kickPower > 0

	if (shootBallFlag && this._inbox.mainAttacker().trainer == this._robot) {
		return this._shootBall(shootBallFlag)
	} else {
		this._shootTarget = nil
	}

	if (requestBallFlag) {
		let ballPos = this._robot.pos + (World.Ball.pos - this._robot.pos).setLength(World.Ball.radius + this._robot.shootRadius)
		this._send.passSuggestion("all",
			{ ballPos = ballPos, time = 0 , manual = true })
	}

	return Manual
}

return Default
