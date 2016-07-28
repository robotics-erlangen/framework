local Error = {}

local World = require "../base/world"

local errorTables = {}

function Error.getErrorTable(robot)
	return errorTables[robot]
end

local function updateErrorTables(isLeavingStop)
	if isLeavingStop then
		errorTables = {}
	end

	for _, r in ipairs(World.FriendlyRobots) do
		if r.radioResponse and r.radioResponse.error_present then
			-- we have an error, save it for debugging purposes
			if r.radioResponse.extended_error then
				errorTables[r] = r.radioResponse.extended_error
			else
				errorTables[r] = {}
			end
		end
	end
end


local lastRefChange, refereeState

local function isLeavingStop()
	return refereeState == "Stop" and World.RefereeState ~= "Stop"
end

local function updateRefereeState()
	if refereeState ~= World.RefereeState then
		refereeState = World.RefereeState
		lastRefChange = World.Time
	end
end

function Error.getLastRefChange()
	return lastRefChange
end


function Error._update()
	local leavingStop = isLeavingStop()
	updateRefereeState()
	updateErrorTables(leavingStop)
end

return Error
