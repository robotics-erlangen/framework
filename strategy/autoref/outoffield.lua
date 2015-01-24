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

local OutOfField = {}

local World = require "../base/world"
local Referee = require "../base/referee"
local rightLine = World.Geometry.FieldWidthHalf
local leftLine = -rightLine
local opponentGoalLine = World.Geometry.FieldHeightHalf
local friendlyGoalLine = -opponentGoalLine

local possibleRefStates = {
    Game = true,
    GameForce = true,
    KickoffOffensive = true,
    KickoffDefensive = true,
    PenaltyOffensive = true,
    PenaltyDefensive = true,
    DirectOffensive = true,
    DirectDefensive = true,
    IndirectOffensive = true,
    IndirectDefensive = true,
}

local function isInField()
    local ballPos = World.Ball.pos
    return ballPos.x <= rightLine
        and ballPos.x >= leftLine
        and ballPos.y >= friendlyGoalLine
        and ballPos.y <= opponentGoalLine
end

local wasInFieldBefore = false
function OutOfField.occuring()
    if not possibleRefStates[World.RefereeState] then return false end
    if wasInFieldBefore and not isInField() then
        wasInFieldBefore = false
        return true
    elseif isInField() then
        wasInFieldBefore = true
    end
    return false
end

function OutOfField.print()
    local faulingTeam = "<font color=\"#C9C60D\">Yellow</font>"
    if (World.TeamIsBlue and Referee.friendlyTouchedLast()) or
            not World.TeamIsBlue and not Referee.friendlyTouchedLast() then
        faulingTeam = "<font color=\"blue\">Blue</font>"
    end
    log("Ball out field. Last touch: " .. faulingTeam)
end

return OutOfField
