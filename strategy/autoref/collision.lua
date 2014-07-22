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
