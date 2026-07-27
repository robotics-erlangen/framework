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

local InterceptPass = Class("Test.Move.InterceptPass", require "group/move/base")

local World = require "../base/world"
local Pass = require "task/shared/pass"
local Striker = require "task/attacker/striker"
local Ball = require "observer/ball"

InterceptPass.MIN_ROBOTS = 2
InterceptPass.MAX_ROBOTS = 2

local LEFT_POS = World.Geometry.FieldHeightHalf - 2
local HEIGHT_POS = World.Geometry.FieldWidthHalf - 0.3

function InterceptPass.canStart()
	return true
end

function InterceptPass:_init()
	self._lastMainAttacker = nil
end

function InterceptPass:_canContinue()
	return true
end

function InterceptPass:_updateTasks()
	local taskAssignments = {}

	local mainAttacker
	local default1 = Vector(HEIGHT_POS, LEFT_POS)
	local default2 = Vector(-HEIGHT_POS, LEFT_POS)
	if Ball.receivesPass(self._robots[1]) or (not Ball.receivesPass(self._robots[2]) and
			World.Ball.pos.x > 0) then
		if self._lastMainAttacker == self._robots[1] then
			taskAssignments[self._robots[1]] = {class = Pass, params = {self._robots[2]}}
		else
			taskAssignments[self._robots[1]] = {class = Striker, params = {default1, default1}}
		end
		mainAttacker = self._robots[1]
	else
		taskAssignments[self._robots[1]] = {class = Striker, params = {default1, default1}}
	end
	if not mainAttacker then
		if self._lastMainAttacker == self._robots[2] then
			taskAssignments[self._robots[2]] = {class = Pass, params = {self._robots[1]}}
		else
			taskAssignments[self._robots[2]] = {class = Striker, params = {default2, default2}}
		end
		mainAttacker = self._robots[2]
	else
		taskAssignments[self._robots[2]] = {class = Striker, params = {default2, default2}}
	end
	self._lastMainAttacker = mainAttacker
	return taskAssignments, mainAttacker
end

return InterceptPass
