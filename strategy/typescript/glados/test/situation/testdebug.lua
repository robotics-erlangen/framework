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
