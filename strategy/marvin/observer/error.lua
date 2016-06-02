local Error = {}

local World = require "../base/world"

local errorTables = {}
local lastRefChange, refereeState

function Error.getErrorTable(robot)
	return errorTables[robot]
end

function Error._updateErrorTables()
	for _,r in ipairs(World.FriendlyRobots) do
		if r.radioResponse and r.radioResponse.error_present then
			--we have an error, save it for debugging purposes
			if r.radioResponse.extendedError then
				errorTables[r]=r.radioResponse.extendedError
			else
				errorTables[r]={}
			end
		end
	end
end

function Error._updateRefereeState()
	if refereeState == "Stop" and World.RefereeState ~= "Stop" then --We leave stop, so delete errors
		errorTables = {}
	end
	if refereeState ~= World.RefereeState then
			refereeState = World.RefereeState
			lastRefChange = World.Time
	end
end

function Error.getLastRefChange()
	return lastRefChange
end

function Error._update()
	Error._updateRefereeState()
	Error._updateErrorTables()
end

return Error
