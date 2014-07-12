local FastShot = {}

local World = require "../base/world"
local Referee = require "../base/referee"

function FastShot.occuring()
    return World.Ball.speed:length() > 8
end

function FastShot.print()
    log("Shot over 8 m/s: " .. World.Ball.speed:length() .. "m/s")
    log("By team: "..  ((World.TeamIsBlue and Referee.friendlyTouchedLast()) and "blue" or "yellow"))
end

return FastShot
