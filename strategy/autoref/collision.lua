--[[***********************************************************************
*   Copyright 2015 Alexander Danzer                                       *
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

local Collision = {}

local World = require "../base/world"

local blue = "<font color=\"blue\">blue</font>"
local yellow  ="<font color=\"#C9C60D\">yellow</font>"
local foulingTeam = World.TeamIsBlue and blue or yellow
local angleDiffSpeed = 0

function Collision.occuring()
    for _, opp in ipairs(World.OpponentRobots) do
        for _, own in ipairs(World.FriendlyRobots) do
            if opp.pos:distanceTo(own.pos) < 2*own.radius and (own.speed-opp.speed):length() > 4.5 then
                if opp.speed:length() > own.speed:length() then
                    foulingTeam = World.TeamIsBlue and yellow or blue
                    angleDiffSpeed = opp.speed:length()
                else
                    foulingTeam = World.TeamIsBlue and blue or yellow
                    angleDiffSpeed = own.speed:length()
                end
                return true -- one foul at a time
            end
        end
    end
    return false
end

function Collision.print()
    log("Collision foul by " .. foulingTeam .. " team")
    log("with " .. angleDiffSpeed .. " m/s")
end

return Collision
