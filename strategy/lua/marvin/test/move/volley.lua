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

local Volley = Class("Test.Move.Volley", require "group/move/base")

local vis = require "../base/vis"
local World = require "../base/world"
local Freekick = require "agent/attacker/freekick"
local Stop = require "agent/attacker/stop"
local AcceptPass = require "task/attacker/acceptpass"
local Striker = require "task/attacker/striker"
local Attack = require "util/attack"

Volley.MIN_ROBOTS = 2
Volley.MAX_ROBOTS = 2

function Volley.canStart()
	return World.RefereeState == "Stop" or World.RefereeState == "IndirectOffensive"
end

function Volley:_init()
	self._freekickPos = Vector(2.5, 3)
	self._startPos = Vector(-2, 0)
	self._shootPos = Vector(-2, 4)
	self._freekickFlag = false
end

function Volley:_canContinue()
	return World.RefereeState == "Stop" or World.RefereeState == "IndirectOffensive"
end

function Volley:_updateTasks()
	local taskAssignments = {}

	if World.RefereeState == "Stop" then
		vis.addCircle("ball placement", self._freekickPos, 0.2, vis.colors.red)
		taskAssignments[self._robots[1]] = { behavior = Stop, restart = self._freekickFlag }
		self._freekickFlag = false
	else
		taskAssignments[self._robots[1]] = { behavior = Freekick, restart = not self._freekickFlag }
		self._freekickFlag = true
	end

	local _, passInfoTable = next(self._inbox.passInfo())
	local startMoving = Attack.checkPassInfos(self._robots[2], passInfoTable, false)
	if startMoving then
		taskAssignments[self._robots[2]] = { class = AcceptPass }
	else
		taskAssignments[self._robots[2]] = { class = Striker, params = { self._startPos, self._shootPos } }
	end

	return taskAssignments, self._robots[1]
end

return Volley
