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
    require "pushing"
}
local foulTimes = {}
local timeout = 3 -- min time between subsequent fouls of the same time

local function wrapper(func)
    return function()
        if not World.update() then
            return -- skip processing if no vision data is available yet
        end
        Referee.checkTouching()
        Referee.illustrateRefereeStates()
        func()
        debug.resetStack()
    end
end

local function main()
    debug.set("last touch", (World.TeamIsBlue and Referee.friendlyTouchedLast()) and "blue" or "yellow")
    debug.set("cornerKick", Referee.isOffensiveCornerKick())
    for _, foul in ipairs(fouls) do
        if foul.occuring() then
            if not foulTimes[foul] or World.Time - foulTimes[foul] > timeout then
                foulTimes[foul] = World.Time
                foul.print()
                log("")
            end
        end
    end
end

Entrypoints.add("main", function()
    main()
end)

return {name = "AutoRef", entrypoints = Entrypoints.get(wrapper)}
