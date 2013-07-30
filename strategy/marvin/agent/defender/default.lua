local Base = require "agent/base/behavior"
local Default = (require "../base/class").new("Agent.Defender.Default", Base)

local World = require "../base/world"
local Class = require "../base/class"
local ManMark = require "task/manmark"
local FarMirror = require "task/farmirror"

function Default:check()
	return true
end

function Default:updateTask()
	local opponentsInOurHalf = false
	for _, robot in ipairs(World.OpponentRobots) do
		if robot.pos.y < 0 then
			opponentsInOurHalf = true
		end
	end

	if opponentsInOurHalf then
		return ManMark
	else
		return FarMirror
	end
end

return Default
