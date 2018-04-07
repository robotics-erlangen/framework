local None = Class("Group.Move.None", require "group/move/base")

local World = require "../base/world"
local Armada = require "group/move/armada"
local WindshieldWiper = require "group/move/windshieldwiper"

local G = World.Geometry

None.MIN_ROBOTS = 5
None.MAX_ROBOTS = 5

function None:_updateTasks()
	local taskAssignments = {}
	for _,r in ipairs(self._robots) do
		taskAssignments[r] = {class = "none", params={}}
	end
	return taskAssignments, self._robots[1]
end

function None:_canContinue()
	if None.Referee.isFriendlyFreeKickState() then
		return true
	end
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2
		and World.RefereeState == "Stop"
end

function None.canStart()
	return Armada.canStart() or WindshieldWiper.canStart()
end

function None._init()
end

return None
