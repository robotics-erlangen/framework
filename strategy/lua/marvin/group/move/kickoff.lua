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

local KickOff = Class("Group.Move.KickOff", require "group/move/base")

local World = require "../base/world"
local G = World.Geometry

local Freekick = require "agent/attacker/freekick"
local AcceptPass = require "task/attacker/acceptpass"
local MoveToPos = require "task/shared/movetopos"
local StopAttack = require "task/attacker/stopattack"
local Striker = require "task/attacker/striker"
local MovesHelper = require "util/moveshelper"
local Attack = require "util/attack"

KickOff.MIN_ROBOTS = 2
KickOff.MAX_ROBOTS = 3

function KickOff.canStart()
	return World.RefereeState == "KickoffOffensivePrepare"
end

function KickOff:_init()
	self._assistantPos = {
		Vector(-G.FieldWidthHalf * 0.7, -0.7),
		Vector(G.FieldWidthHalf * 0.7, -0.7),
	}
	self._passDest = {
		Vector(-G.FieldWidthHalf * 0.9, -0.2),
		Vector(G.FieldWidthHalf * 0.9, -0.2),
	}

	local positions = { Vector(0, 0) }
	for i = 1,#self._robots-1 do
		table.insert(positions, self._assistantPos[i])
	end
	self._assignments = MovesHelper.assignRobots(self._robots, positions, 0)
end

function KickOff:_canContinue()
	return World.RefereeState == "KickoffOffensivePrepare"
			or World.RefereeState == "KickoffOffensive"
end

function KickOff:_updateTasks()
	local taskAssignments = {}

	if World.RefereeState == "KickoffOffensivePrepare" then
		taskAssignments[self._robots[self._assignments[1]]] = { class = StopAttack, params = {} }
		taskAssignments[self._robots[self._assignments[2]]] = { class = MoveToPos, params = { self._assistantPos[1] } }
		if #self._robots == 3 then
			taskAssignments[self._robots[self._assignments[3]]] = { class = MoveToPos, params = { self._assistantPos[2] } }
		end
	else
		local _, passInfoTable = next(self._inbox.passInfo())
		taskAssignments[self._robots[self._assignments[1]]] = { behavior = Freekick }
		for i=1,#self._robots-1 do
			if Attack.checkPassInfos(self._robots[self._assignments[i+1]], passInfoTable, false) then
				taskAssignments[self._robots[self._assignments[i+1]]] = { class = AcceptPass }
			else
				taskAssignments[self._robots[self._assignments[i+1]]] = { class = Striker, params = { self._assistantPos[i], self._passDest[i] } }
			end
		end
	end

	return taskAssignments, self._robots[self._assignments[1]]
end

return KickOff
