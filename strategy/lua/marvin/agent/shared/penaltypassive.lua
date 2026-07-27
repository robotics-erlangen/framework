--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
*************************************************************************]]

local Base = require "agent/base/behavior"
local PenaltyPassive = Class("Agent.Shared.PenaltyPassive", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local G = World.Geometry

local MoveToPos = require "task/shared/movetopos"

function PenaltyPassive:_stop()
	self._penaltyStartTime = nil
	self._contactPoint = nil
	self._shootGoalFlag = false
	self._forceDesperate = false
end

function PenaltyPassive:check()
	local isOffensivePenalty = World.RefereeState == "PenaltyOffensivePrepare" or World.RefereeState == "PenaltyOffensive"
	-- local isDefensivePenalty = World.RefereeState == "PenaltyDefensivePrepare" or World.RefereeState == "PenaltyDefensive"
	local isShootout = World.GameStage == "PenaltyShootout"
	return isShootout and (isOffensivePenalty or self:_checkPenaltyOngoing())
end

function PenaltyPassive:_checkPenaltyOngoing()
	return self._penaltyStartTime and World.Time - self._penaltyStartTime < 15 and not Referee.isStopState()
end

function PenaltyPassive:_updateTask()
	if World.RefereeState == "PenaltyOffensive" and not self._penaltyStartTime then
		-- log("Start Time set")
		self._penaltyStartTime = World.Time
	end

	return MoveToPos, {Vector(G.FieldWidthHalf - 0.75, -G.FieldHeightHalf + 0.75)}
end

return PenaltyPassive