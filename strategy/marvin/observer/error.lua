local Error = {}

local World = require "../base/world"

local errorTables = {}
local batteryTable = {}
local BATTERY_TABLE_SIZE = 50
local lastStopTime = 0

function Error.getAverageBatterySate(robot)
	if not batteryTable[robot] or batteryTable[robot].size == 0 then
		return 1
	end
	return batteryTable[robot].sum / batteryTable[robot].size
end

local function initBatteryTable(robot)
	batteryTable[robot] = {size= 0, next = 1, sum = 0, outlayers = 0}
end

local function addBatteryState(robot, newBatteryState)
	local robotBatteryTable = batteryTable[robot]
	if not robotBatteryTable then
		initBatteryTable(robot)
		robotBatteryTable = batteryTable[robot]
	end
	if robotBatteryTable.size < BATTERY_TABLE_SIZE then
		robotBatteryTable.sum = robotBatteryTable.sum + newBatteryState
		robotBatteryTable.size = robotBatteryTable.size  + 1
	else
		local avg = Error.getAverageBatterySate(robot)
		if math.abs(avg - newBatteryState) > 0.2 then
				if robotBatteryTable.outlayers > 15 then
					initBatteryTable(robot)
					addBateryState(robot, newBatteryState)
					return
				end
				robotBatteryTable.outlayers = robotBatteryTable.outlayers + 1
				return
		end
		robotBatteryTable.sum = robotBatteryTable.sum  + newBatteryState - robotBatteryTable[robotBatteryTable.next]
	end
	robotBatteryTable.outlayers = 0
	robotBatteryTable[robotBatteryTable.next] = newBatteryState
	robotBatteryTable.next = math.fmod(robotBatteryTable.next + 1, BATTERY_TABLE_SIZE)
end

function Error.getErrorTable(robot)
	return errorTables[robot]
end

local function convertErrorTable(errorTable)
	local newTable = {}
	for k,v in pairs(errorTable) do
		if type(v) == "number" then
			newTable[k] = v
		elseif v then
			newTable[k] = 1
		end
	end
	return newTable
end

local function addErrorTables(errorTable1, errorTable2)
	if not errorTable1 and not errorTable2 then
		return {}
	end
	if not errorTable1 then
		return convertErrorTable(errorTable2)
	end
	if not errorTable2 then
		return convertErrorTable(errorTable1)
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
			if newTable[k] then
				newTable[k] = newTable[k] + 1
			else
				newTable[k] = 1
			end
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

local function updateRefereeState()
	if refereeState ~= World.RefereeState then
		refereeState = World.RefereeState
		lastRefChange = World.Time
	end
end

local function updateLastStopTime(isLeavingStop)
	if isLeavingStop then
		lastStopTime = World.Time
	end
end

function Error.getLastRefChange()
	return lastRefChange
end

function Error.getLastStopTime()
	return lastStopTime
end

local function isLeavingStop()
	return refereeState == "Stop" and World.RefereeState ~= "Stop"
end

function Error._update()
	local leavingStop = isLeavingStop()
	for _, r in ipairs(World.FriendlyRobots) do
		if r.radioResponse and r.radioResponse.battery then
			addBatteryState(r,r.radioResponse.battery)
		end
	end
	updateRefereeState()
	updateLastStopTime(isLeavingStop)
	updateErrorTables(leavingStop)
end

return Error
