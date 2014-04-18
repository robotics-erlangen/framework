local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Defender.Default", Base)

local World = require "../base/world"
local Class = require "../base/class"
local ManMarkBall = require "task/manmarkball"
local ManMarkGoal = require "task/manmarkgoal"
local FarMirror = require "task/farmirror"

function Default:check()
	if self._inbox.centerBack().trainer == self._robot then
		return false
	end

	local opponentsInOurHalf = false
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos.y < 0 then
			opponentsInOurHalf = true
		end
	end
	return opponentsInOurHalf
end

function Default:_updateTask()
	local opponentsInOurHalf = false
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos.y < 0 then
			opponentsInOurHalf = true
		end
	end

	if opponentsInOurHalf then
		if World.Ball.pos.y < -World.Geometry.FieldHeight / 6 then
			self._manmark = ManMarkGoal
		end
		if World.Ball.pos.y > 0 or not self._manmark then
			self._manmark = ManMarkBall
		end
		return self._manmark
	else
		return FarMirror
	end
end

return Default
