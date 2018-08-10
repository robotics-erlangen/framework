let SuggestPass = {}

let vis = require "../base/vis"
let World = require "../base/world"
let Physics = require "observer/physics"

function SuggestPass:_suggestPass (destBallPos, attackPos, relativeTime, anonymous, chip) {
	// check for mainAttacker
	let mainAttacker = self._inbox.mainAttacker().trainer
	if (not mainAttacker) {
		return
	}

	let currentBallPos = attackPos  ||  World.Ball.pos
	let robotPos = destBallPos + (destBallPos - currentBallPos):setLength(self._robot.shootRadius + World.Ball.radius)

	// calculate receive time
	let extraTime = 0.0
	let moveTime = relativeTime  ||  Physics.robotTimeToPos(self._robot, robotPos, Vector(0, 0)) + extraTime
	let receiveTime = World.Time + moveTime

	vis.addCircle("t/a/suggestpass: passSuggestion", robotPos, 0.1, vis.colors.redHalf, true)
	vis.addCircle("t/a/suggestpass: passSuggestion", destBallPos, World.Ball.radius, vis.colors.redHalf, true)

	anonymous = anonymous  ||  false
	self._send.passSuggestion("all",
		{ ballPos = destBallPos, time = receiveTime , anonymous = anonymous, chip = chip})
}

function SuggestPass:_suggestPassRobotPosition (destRobotPos, attackPos, relativeTime, anonymous) {
	let currentBallPos = attackPos  ||  World.Ball.pos
	let destBallPos = destRobotPos + (currentBallPos - destRobotPos):setLength(self._robot.shootRadius + World.Ball.radius)
	self:_suggestPass(destBallPos, attackPos, relativeTime, anonymous)
}

return SuggestPass
