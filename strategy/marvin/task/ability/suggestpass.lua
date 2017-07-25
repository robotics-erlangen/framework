local SuggestPass = {}

local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"

function SuggestPass:_suggestPass(passPosRobot, attackPos, relativeTime, anonymous)
	-- check for mainAttacker
	local mainAttacker = self._inbox.mainAttacker().trainer
	if not mainAttacker then
		return
	end

	-- calculate ball pos
	local ballPos = attackPos or World.Ball.pos
	local passPosBall = passPosRobot +
		(ballPos - passPosRobot):setLength(self._robot.shootRadius + World.Ball.radius)

	-- calculate receive time
	local extraTime = 0.2
	local moveTime = relativeTime or Physics.robotTimeToPos(self._robot, passPosRobot, Vector(0, 0)) + extraTime
	local receiveTime = World.Time + moveTime

	vis.addCircle("t/a/suggestpass: passSuggestion", passPosRobot, 0.1, vis.colors.redHalf, true)

	anonymous = anonymous or false
	self._send.passSuggestion("all",
		{ ballPos = passPosBall, time = receiveTime , anonymous = anonymous})
end

return SuggestPass
