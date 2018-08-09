local SuggestPass = {}

local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"

function SuggestPass:_suggestPass(destBallPos, attackPos, relativeTime, anonymous, chip)
	// check for mainAttacker
	local mainAttacker = self._inbox.mainAttacker().trainer
	if not mainAttacker then
		return
	end

	local currentBallPos = attackPos or World.Ball.pos
	local robotPos = destBallPos + (destBallPos - currentBallPos):setLength(self._robot.shootRadius + World.Ball.radius)

	// calculate receive time
	local extraTime = 0.0
	local moveTime = relativeTime or Physics.robotTimeToPos(self._robot, robotPos, Vector(0, 0)) + extraTime
	local receiveTime = World.Time + moveTime

	vis.addCircle("t/a/suggestpass: passSuggestion", robotPos, 0.1, vis.colors.redHalf, true)
	vis.addCircle("t/a/suggestpass: passSuggestion", destBallPos, World.Ball.radius, vis.colors.redHalf, true)

	anonymous = anonymous or false
	self._send.passSuggestion("all",
		{ ballPos = destBallPos, time = receiveTime , anonymous = anonymous, chip = chip})
end

function SuggestPass:_suggestPassRobotPosition(destRobotPos, attackPos, relativeTime, anonymous)
	local currentBallPos = attackPos or World.Ball.pos
	local destBallPos = destRobotPos + (currentBallPos - destRobotPos):setLength(self._robot.shootRadius + World.Ball.radius)
	self:_suggestPass(destBallPos, attackPos, relativeTime, anonymous)
end

return SuggestPass
