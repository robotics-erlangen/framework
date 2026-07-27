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
local DefendPenaltyShootout = Class("Agent.Defender.DefendPenaltyShootout", Base)

local Referee = require "../base/referee"
local World = require "../base/world"
local G = World.Geometry
local Keeper = require "task/keeper/keeper"
local ShootoutKeeper = require "task/keeper/shootoutkeeper"

local CRITICAL_DISTANCE = 4


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
		if World.RefereeState == "Game" and r.pos:distanceTo(G.FriendlyGoal) < CRITICAL_DISTANCE then
			return ShootoutKeeper
		end
	end
	return Keeper
end

return DefendPenaltyShootout
