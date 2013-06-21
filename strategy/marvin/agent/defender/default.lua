local Base = require "agent/base/behaviour"
local Default = (require "../base/class").new("Agent.Defender.Default", Base)

local World = require "../base/world"
local Class = require "../base/class"
local ManMark = require "task/manmark"
local FarMirror = require "task/farmirror"

function Default:_check()
	return Base.State.Active
end

function Default:_run()
	local opponentsInOurHalf = false
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos.y < 0 then
			opponentsInOurHalf = true
		end
	end

	if opponentsInOurHalf then
		if not self._task or Class.name(self._task, true) ~= "ManMark" then
			self._task = ManMark.create(self._robot)
		end
	else
		if not self._task or Class.name(self._task, true) ~= "FarMirror"then
			self._task = FarMirror.create(self._robot)
		end
	end
end

return Default
