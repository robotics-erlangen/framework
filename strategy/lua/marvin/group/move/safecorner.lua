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

local SafeCorner = Class("Group.Move.SafeCorner", require "group/move/base")

local Referee = require "../base/referee"
local World = require "../base/world"
local Freekick = require "agent/attacker/freekick"
local MoveToPos = require "task/shared/movetopos"
local StopAttack = require "task/attacker/stopattack"
local Striker = require "task/attacker/striker"
local G = World.Geometry

SafeCorner.MIN_ROBOTS = 5
SafeCorner.MAX_ROBOTS = 5

function SafeCorner.canStart()
	return  World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 --and Referee.opponentTouchedLast()
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2
		and World.RefereeState == "Stop"
end

function SafeCorner:_init()
	self._ballSide = (World.Ball.pos.x > 0) and 1 or -1 --Instanzvariable
	self._goalDist = G.DefenseRadius + 0.4
end

function SafeCorner:_canContinue()
	if Referee.isFriendlyFreeKickState() then
		return true
	end
	return World.Ball.pos.y > 4 * G.FieldHeightHalf / 5 - 0.2 --Eckposition festlegen
		and math.abs(World.Ball.pos.x) > G.FieldWidthHalf / 2 - 0.2 --G: geometry
		and World.RefereeState == "Stop"
end

function SafeCorner:_updateTasks()

	local taskAssignments = {}
	if World.RefereeState == "Stop" then
		taskAssignments[self._robots[1]] = { class = StopAttack, params = { } }
	elseif Referee.isFriendlyFreeKickState() then
		taskAssignments[self._robots[1]] = { behavior = Freekick }
	end

	taskAssignments[self._robots[2]] = { class = Striker, params = { Vector(0, G.FieldHeightHalf * -0.5), Vector(0, 0) }}
	taskAssignments[self._robots[3]] = { class = Striker, params = { Vector(self._ballSide * G.FieldWidthHalf * -0.5, G.FieldHeightHalf * -0.5),
		Vector(self._ballSide * G.FieldWidthHalf * -0.5, 0) }}
	taskAssignments[self._robots[4]] = { class = MoveToPos, params = { Vector(0.3, G.OpponentGoal.y - G.DefenseRadius - 0.4)}}
	-- taskAssignments[self._robots[5]] = { class = MoveToPos, params = { Vector(, )}}


	return taskAssignments, self._robots[1]
end
return SafeCorner
