local Error = {}

local Referee = require "../base/referee"
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
	batteryTable[robot] = {size= 0, next = 1, sum = 0, outlayers = {size = 0, next = 1, sum = 0}}
end

local function insertRingBuffer(ringbuffer, value)
	if not ringbuffer then
		return
	end

	if not ringbuffer.next then
		ringbuffer.size = 0
		ringbuffer.next = 1
		ringbuffer.sum = 0
	end

	if ringbuffer.size < BATTERY_TABLE_SIZE then
		ringbuffer.sum = ringbuffer.sum + value
		ringbuffer.size = ringbuffer.size + 1
	else
		ringbuffer.sum = ringbuffer.sum + value - ringbuffer[ringbuffer.next]
	end
	ringbuffer[ringbuffer.next] = value
	ringbuffer.next = math.fmod(ringbuffer.next + 1, BATTERY_TABLE_SIZE)
end

local function addBatteryState(robot, newBatteryState)
	local robotBatteryTable = batteryTable[robot]
	if not robotBatteryTable then
		initBatteryTable(robot)
		robotBatteryTable = batteryTable[robot]
	end
	if robotBatteryTable.size == BATTERY_TABLE_SIZE then
		local avg = Error.getAverageBatterySate(robot)
		if math.abs(avg - newBatteryState) > 0.2 then
			if robotBatteryTable.outlayers.size > 15 then
				batteryTable[robot] = robotBatteryTable.outlayers
				batteryTable[robot].outlayers = {size = 0}
				addBatteryState(robot, newBatteryState)
				return
			end
			insertRingBuffer(robotBatteryTable.outlayers, newBatteryState)
			return
		end
	end
	robotBatteryTable.outlayers = {size = 0}
	insertRingBuffer(robotBatteryTable, newBatteryState)
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

--we don't have any feedback by our robots. At least we have to assume its like that
--We still want to be able to detect broken bots.
--To do so, we use the previous moveTo. If it is far (~0.5m) from our current pos while our speed is slow we increase a counter.
--If that stays true for 4.5 s (that is, 450 runs), we consider the robot to be damaged.
--We reset this counter if the robot gets fast eanough, or reaches its destination.
--We want the robot to stay at the error position if it was decided that it's broken. Therefore, we don't tick down due to position if the robot was
--detected as failure, and will only tick down if a certain speed was reached.
--If the robot is invisible, speedError does tick down, this is to ensure that a exchanged robot that may have been repaired by humans is ok after reinsertion
local speedError = {}
local function updateSpeedError()
	local halfSpeed = Referee.isSlowDriveState() and 0.75 or 1.5
	for _,robot in ipairs(World.FriendlyRobots) do
		if robot.prevMoveTo then
			if robot.speed:lengthSq() < halfSpeed * halfSpeed and robot.pos:distanceToSq(robot.prevMoveTo) > 0.5 * 0.5 then
				if speedError[robot] and speedError[robot] <= 450 then
					speedError[robot] = speedError[robot] + 1
				elseif not speedError[robot] then
					speedError[robot] = 1
				end
			elseif speedError[robot] and speedError[robot] >= 10 and (speedError[robot] <= 300 or
				robot.speed:lengthSq() > halfSpeed * halfSpeed) then
				speedError[robot] = speedError[robot] - 10
			end
		end
	end
	for _, robot in ipairs(World.FriendlyInvisibleRobots) do
		if speedError[robot] then
			speedError[robot] = speedError[robot] - 1
		end
	end
end

function Error.getSpeedErrorCount(robot)
	return speedError[robot] or 0
end

function Error._update()
	local leavingStop = isLeavingStop()
	for _, r in ipairs(World.FriendlyRobots) do
		if r.radioResponse and r.radioResponse.battery then
			addBatteryState(r,r.radioResponse.battery)
		end
	end
	updateRefereeState()
	updateLastStopTime(leavingStop)
	updateErrorTables(leavingStop)
	updateSpeedError()
end

return Error
