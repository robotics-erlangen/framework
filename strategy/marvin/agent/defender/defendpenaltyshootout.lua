local Base = require "agent/base/behavior"
local DefendPenaltyShootout = Class("Agent.Defender.DefendPenaltyShootout", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local G = World.Geometry
local Keeper = require "task/keeper"
local Duel = require "task/duel"
local AggressiveKeeper = require "task/aggressivekeeper"

local CRITICAL_DISTANCE = 3


function DefendPenaltyShootout:_stop()
	self._penaltyStartTime = nil
end

function DefendPenaltyShootout:check()
	-- log("1: "..tostring(World.GameStage == "PenaltyShootout"))
	-- log("2: "..tostring(World.RefereeState == "PenaltyDefensivePrepare"))
	-- log("3: "..tostring(World.RefereeState == "PenaltyDefensive"))
	-- log("4: "..tostring(self:_checkPenaltyOngoing()))
	return World.GameStage == "PenaltyShootout"
		and (World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive" or self:_checkPenaltyOngoing())
end

function DefendPenaltyShootout:_checkPenaltyOngoing()
	return self._penaltyStartTime and World.Time - self._penaltyStartTime < 15 and not Referee.isStopState()
end


function DefendPenaltyShootout:_updateTask()
	if World.RefereeState == "PenaltyDefensive" and not self._penaltyStartTime then
		self._penaltyStartTime = World.Time
	end

	for _, r in ipairs(World.OpponentRobots) do
		if r.pos:distanceTo(G.FriendlyGoal) < CRITICAL_DISTANCE then
			return AggressiveKeeper
		end
	end
	return Keeper
end

return DefendPenaltyShootout