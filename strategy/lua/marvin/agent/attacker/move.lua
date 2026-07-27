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
local Move = Class("Agent.Attacker.Move", Base)

function Move:check()
	return self._inbox.moveAssignment().trainer ~= nil
end

function Move:_updateTask()
	local _, passInfoTable = next(self._inbox.passInfo())
	if passInfoTable then
		for _, passInfo in ipairs(passInfoTable) do
			if passInfo.target == self._robot then
				self._forceKeepingInPool = true
				break
			end
		end
	end

	local assignment = self._inbox.moveAssignment().trainer

	if assignment.mainAttacker then
		self:_applyForMainAttacker(nil, nil, 2)
	end
	if assignment.behavior then
		return self:runDeferredBehavior(assignment.behavior, assignment.restart)
	end

	return assignment.class, assignment.params, assignment.restart
end

return Move
