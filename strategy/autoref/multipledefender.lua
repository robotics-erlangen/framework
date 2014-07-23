local MultipleDefender = {}

local World = require "../base/world"
local Field = require "../base/field"

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

local offendingTeam =""
local occupation = ""

local function robotIsOffending(robot, team, testOccupation)
    local defAreaDistThreshold = (testOccupation == "partial") and robot.radius or -robot.radius
    if Field["isIn"..team.."DefenseArea"](robot.pos, defAreaDistThreshold) then
        local touchDistance = World.Ball.radius + robot.radius
        if robot.pos:distanceTo(World.Ball.pos) < touchDistance then
            if (World.TeamIsBlue and team == "Opponent")
                or (not World.TeamIsBlue and team == "Friendly")
            then
                offendingTeam = "<font color=\"#C9C60D\">yellow</font>"
            else
                offendingTeam = "<font color=\"blue\">blue</font>"
            end
            occupation = testOccupation
            return true
        end
    end
end

local function checkTeam(team)
    for _, robot in ipairs(World[team .. "Robots"]) do
        if robot ~= World[team .. "Keeper"] then
            if robotIsOffending(robot, team, "full") then return true end
            if robotIsOffending(robot, team, "partial") then return true end
        end
    end
end

function MultipleDefender:occuring()
    if not possibleRefStates[World.RefereeState] then return false end
    if checkTeam("Opponent") or checkTeam("Friendly") then
        return true
    end

    return false
end

function MultipleDefender:print()
    log("Multiple defenders by " .. offendingTeam .. " team: " .. occupation .. " occupation")
end

return MultipleDefender
