local SuggestPass = {}

local vis = require "../base/vis"
local World = require "../base/world"
local Physics = require "observer/physics"

function SuggestPass:_suggestPass(passPosRobot, attackPos, relativeTime)
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
	local moveTime = relativeTime or Physics.robotTimeToPos(self._robot, passPosRobot, Vector(0, 0), true)
	local receiveTime = World.Time + moveTime + 0.5

	vis.addCircle("t/a/suggestpass: passSuggestion", passPosRobot, 0.1, vis.colors.redHalf, true)

	self._send.passSuggestion(mainAttacker,
		{ ballPos = passPosBall, time = receiveTime })
end

return SuggestPass
