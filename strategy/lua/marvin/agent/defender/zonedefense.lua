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
local ZoneDefense = Class("Agent.Defender.ZoneDefense", Base)

local BallEvadingMoveToPos = require "task/defender/ballevadingmovetopos"

function ZoneDefense:_stop()
	self._movePos = nil
end

function ZoneDefense:check()
	local role = self._inbox.roleAssignment().trainer
	return role and role.name == "ZoneDefense"
end

function ZoneDefense:_updateTask()
	local movePos = self._inbox.roleAssignment().trainer.params[1]
	local restartTask = movePos ~= self._movePos
	self._movePos = movePos

	return BallEvadingMoveToPos, {self._movePos, nil}, restartTask
end

return ZoneDefense
