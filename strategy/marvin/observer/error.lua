local Error = {}

local World = require "../base/world"

local errorTables = {}

function Error.getErrorTable(robot)
	return errorTables[robot]
end

local function addErrorTables(errorTable1, errorTable2)
	if not errorTable1 and not errorTable2 then
		return {}
	end
	if not errorTable1 then
		return errorTable2
	end
	if not errorTable2 then
		return errorTable1
	end
	local newTable = {}
	for k,v in pairs(errorTable1) do
		if type(v) == "number" then
			newTable[k] = v
		elseif v then
			newTable[k] = 1
		end
	end
	for k,v in pairs(errorTable2) do
		if type(v) == "number" then
			--errorTable2 is newer than errorTable1, so override errorTable1
			newTable[k] = v
		elseif v then
			newTable[k] = newTable[k] + 1
		end
	end
	return newTable
end

local function updateErrorTables(isLeavingStop)
	if isLeavingStop then
		errorTables = {}
	end

	for _, r in ipairs(World.FriendlyRobots) do
		if r.radioResponse and r.radioResponse.error_present then
			-- we have an error, save it for debugging purposes
			errorTables[r] = addErrorTables(errorTables[r], r.radioResponse.extended_error)
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
