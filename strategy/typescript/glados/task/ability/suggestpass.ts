let SuggestPass = {}

import * as vis from "base/vis";
import * as World from "base/world";
import * as Physics from "glados/observer/physics";

function SuggestPass:_suggestPass (destBallPos, attackPos, relativeTime, anonymous, chip) {
	// check for mainAttacker
	let mainAttacker = this._inbox.mainAttacker().trainer
	if (not mainAttacker) {
		return
	}

	let currentBallPos = attackPos || World.Ball.pos
	let robotPos = destBallPos + (destBallPos - currentBallPos).setLength(this._robot.shootRadius + World.Ball.radius)

	// calculate receive time
	let extraTime = 0.0
	let moveTime = relativeTime || Physics.robotTimeToPos(this._robot, robotPos, new Vector(0, 0)) + extraTime
	let receiveTime = World.Time + moveTime

	vis.addCircle("t/a/suggestpass: passSuggestion", robotPos, 0.1, vis.colors.redHalf, true)
	vis.addCircle("t/a/suggestpass: passSuggestion", destBallPos, World.Ball.radius, vis.colors.redHalf, true)

	anonymous = anonymous || false
	this._send.passSuggestion("all",
		{ ballPos = destBallPos, time = receiveTime , anonymous = anonymous, chip = chip})
}

function SuggestPass:_suggestPassRobotPosition (destRobotPos, attackPos, relativeTime, anonymous) {
	let currentBallPos = attackPos || World.Ball.pos
	let destBallPos = destRobotPos + (currentBallPos - destRobotPos).setLength(this._robot.shootRadius + World.Ball.radius)
	this._suggestPass(destBallPos, attackPos, relativeTime, anonymous)
}

return SuggestPass
