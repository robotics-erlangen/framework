local Armada = {}
local ArmadaTask = require "moves/armada/task"
local Ball = require "observer/ball"
local Referee = require "../base/referee"
local World = require "../base/world"

local G = World.Geometry
function Armada.canStart()
		return  World.Ball.pos.y > G.FieldHeightHalf/5 and Referee.opponentTouchedLast()
				and math.abs(World.Ball.pos.x) > G.FieldWidthHalf/2
				and (World.RefereeState == "Stop" or Referee.isFriendlyFreeKickState())
end

function Armada.canContinue()
	if Referee.isFriendlyFreeKickState() then
		-- EXECUTION state (second): pass is executed
		if Ball.isShot() then -- let normal game take over
			return false
		end
		return true
	end
	return World.Ball.pos.y > G.FieldHeightHalf/5 - 0.2 and math.abs(World.Ball.pos.x) > G.FieldWidthHalf/2 - 0.2
		and World.RefereeState == "Stop"
end

function Armada.run(behavior)
	local _, msg = next(behavior._inbox.passPos())
		local passToMe = msg and msg.robot == behavior._robot
		if passToMe and Class.name(behavior._agent) == "Agent.Defender" then
			behavior._send.poolChangeRequest("trainer")
			-- this causes another robot to become defender. this one does not
			-- participate in the formation anymore. Not very bad as the pass
			-- decision has already been made, but still not very consistent...
	end
end

function Armada.size()
	return 4
end

function Armada.excludeKeeper()
	return true
end

function Armada.getName()
	return "Armada"
end

function Armada.updateTask(offset)
	return ArmadaTask, { offset }
end

return Armada
