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

local Base = Class("Group.Move.Base")

Base.Referee = require "../base/referee"

Base.MIN_ROBOTS = -1
Base.MAX_ROBOTS = -1


function Base.canStart()
	error("stub")
end

function Base.injectReferee(pseudoRef)
	Base.Referee = pseudoRef
end

function Base:_init()
	error("stub")
end

function Base:_canContinue()
	error("stub")
end

function Base:_updateTasks()
	error("stub")
end


function Base:init(robots, inbox)
	self._firstFrame = true
	self._robots = robots
	self._inbox = inbox
	self:_init()
end

function Base:updateTasks()
	local assignments, mainAttacker = self:_updateTasks()
	for _, assignment in pairs(assignments) do
		assignment.restart = assignment.restart or self._firstFrame -- TODO: test
	end
	self._firstFrame = false
	return assignments, mainAttacker
end


return Base
