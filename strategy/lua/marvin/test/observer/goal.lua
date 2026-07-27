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

local GoalTest = {}

local debug = require "../base/debug"
local vis = require "../base/vis"
local World = require "../base/world"
local Goal = require "observer/goal"


function GoalTest.testFreeSectors()
	local freeSectors = Goal.freeSectors(World.Ball.pos, World.OpponentRobots, true)
	vis.setColor(vis.colors.orangeHalf, true)
	for _, s in ipairs(freeSectors) do
		--log(tostring(s[1]) .. " "..tostring(s[2]))
		local pointRight = World.Ball.pos + Vector.fromAngle(s[1])*10
		local pointLeft = World.Ball.pos + Vector.fromAngle(s[2])*10
		vis.addPolygon("test: Free Sectors", {World.Ball.pos, pointRight, pointLeft})
	end
end

function GoalTest.testCustomFreeSectors()
	local freeSectors = Goal.allFreeSectors(World.Ball.pos, World.OpponentRobots)
	for i,sector in ipairs(freeSectors) do
		debug.set("sector["..i.."]", "{"..sector[1]..", "..sector[2].."}")
	end
	vis.setColor(vis.colors.orangeHalf, true)
	for _, s in ipairs(freeSectors) do
		vis.addPizza("test: Custom Free Sectors", World.Ball.pos, 5, s[2], s[1])
	end
end

return GoalTest
