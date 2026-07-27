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

local debugcommands = require "../base/debugcommands"
local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"


local init = false
local changed = false
local startTime

local function testRef()
	if not init then
		debugcommands.sendRefereeCommand("Halt", "FirstHalf")
		-- this works:
		-- debugcommands.sendRefereeCommand(nil, "FirstHalf")
		-- debugcommands.sendRefereeCommand("Halt")
		init = true
		startTime = World.Time
	end

	if World.Time - startTime > 3 and not changed then
		changed = true
		debugcommands.sendRefereeCommand("DirectOffensive", "SecondHalf")
	end
end


Entrypoints.add("testReferee", testRef)
