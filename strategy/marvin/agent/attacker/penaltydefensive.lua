local Base = require "agent/base/behavior"
local PenaltyShootoutDefensive = Class("Agent.Attacker.PenaltyShootoutDefensive", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local G = World.Geometry

local MoveToPos = require "task/movetopos"

function PenaltyShootoutDefensive:_stop()
	self._penaltyStartTime = nil
	self._contactPoint = nil
	self._shootGoalFlag = false
	self._forceDesperate = false
end

function PenaltyShootoutDefensive:check()
	local isPenalty = World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive"
	local isShootout = World.GameStage == "PenaltyShootout"
	return isShootout and (isPenalty or self:_checkPenaltyOngoing())
end

function PenaltyShootoutDefensive:_checkPenaltyOngoing()
	return self._penaltyStartTime and World.Time - self._penaltyStartTime < 15 and not Referee.isStopState()
end

function PenaltyShootoutDefensive:_updateTask()
	if World.RefereeState == "PenaltyDefensive" and not self._penaltyStartTime then
		-- log("Start Time set")
		self._penaltyStartTime = World.Time
	end

	return MoveToPos, {Vector(G.FieldWidthHalf - 0.75, G.FieldHeightHalf - 0.75)}
end

return PenaltyShootoutDefensive
