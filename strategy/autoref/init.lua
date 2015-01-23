--[[***********************************************************************
*   Copyright 2015 Alexander Danzer, Michael Eischer                      *
*   Robotics Erlangen e.V.                                                *
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

require("../base/globalschecker").enable()
require "../base/base"

local Entrypoints = require "../base/entrypoints"
local World = require "../base/world"
local debug = require "../base/debug"
local Referee = require "../base/referee"

local fouls = {
    require "chipovermiddle",
    require "collision",
    require "fastshot",
    require "outoffield",
    require "pushing",
    require "multipledefender"
}
local foulTimes = {}
local timeout = 3 -- minimum time between subsequent fouls of the same kind

local function wrapper(func)
    return function()
    	-- require "../test/debug/enable"
        if not World.update() then
            return -- skip processing if no vision data is available yet
        end
        Referee.checkTouching()
        Referee.illustrateRefereeStates()
		--Processor.pre()
        func()
		--World.setRobotCommands()
		--Processor.post()
        debug.resetStack()
		--Cache.resetFrame()
    end
end

local function main()
    debug.set("last touch", (World.TeamIsBlue and Referee.friendlyTouchedLast()) and "blue" or "yellow")
    for _, foul in ipairs(fouls) do
        if foul.occuring() and (not foulTimes[foul] or World.Time - foulTimes[foul] > timeout) then
            foulTimes[foul] = World.Time
            foul.print()
        end
    end
end

Entrypoints.add("main", function()
    main()
end)

return {name = "AutoRef", entrypoints = Entrypoints.get(wrapper)}
