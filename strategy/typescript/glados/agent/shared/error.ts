local Base = require "agent/base/behavior"
local Error = Class("Agent.Shared.Error",Base)
local ErrorTask = require "task/shared/error"
local World = require "../base/world"
local Referee = require "../base/referee"
local ErrorObserver = require "observer/error"
local ERROR_TOLERANCE_PER_SEC = 3 // <- [0.5,1]
local EXCHANGE_ERROR_ROBOTS = false
local EXCHANGE_LOW_BAT_ROBOTS = false
local EXCHANGE_LOW_BAT_DURING_GAME = false
local EXCHANGE_ERROR_ROBOTS_SPEED = false

function Error:check()
	local errorTable = ErrorObserver.getErrorTable(self._robot)
	if self._active and World.RefereeState == "Stop" then
		return true
	elseif self._active and ErrorObserver.getSpeedErrorCount(self._robot) > 100 then
		return true
	elseif ErrorObserver.getSpeedErrorCount(self._robot) >= 300 and self._robot ~= World.FriendlyKeeper then
		return EXCHANGE_ERROR_ROBOTS_SPEED
	elseif ErrorObserver.getAverageBatterySate(self._robot)< 0.11 and self._robot ~= World.FriendlyKeeper then
		return EXCHANGE_LOW_BAT_DURING_GAME
	elseif ErrorObserver.getAverageBatterySate(self._robot)< 0.20
		and World.RefereeState == "Stop" then
		if self._robot == World.FriendlyKeeper then
			if Referee.lastStateChangeTime() == World.Time then
				log("keeper ".. self:errorMsg())
			end
			return false
		end
		return EXCHANGE_LOW_BAT_ROBOTS
	elseif not errorTable then
		return false
	elseif self._robot == World.FriendlyKeeper then
		if Referee.lastStateChangeTime() == World.Time then
			log("keeper " .. self:errorMsg())
		end
		return false
	end
	local gameTimespan = World.Time - ErrorObserver.getLastStopTime()

	for k,v in pairs(errorTable) do
		if gameTimespan > 2 and v > ERROR_TOLERANCE_PER_SEC * gameTimespan
				and k ~= "temperature" and k~="main_sensor_error" then
			if World.RefereeState == "Stop" then
				//log(self._robot.id .. " ////////   " .. k ..  "  //////////////  " .. v)
				return EXCHANGE_ERROR_ROBOTS
			end
		end
	end
	return false
end

function Error:start()
	log(self:errorMsg())
	self._active = true
end

function Error:_stop()
	self._active = false
end

function Error:errorMsg()
	local out = tostring(self._robot.id) .. ": "
	local msgParts = {}
	local errorData = ErrorObserver.getErrorTable(self._robot)
	out = out .. "battery: " .. tostring(ErrorObserver.getAverageBatterySate(self._robot)) .." "
	if not errorData then
		return out
	end
	if errorData.motor_1_error then
		table.insert(msgParts, "motor 1 error" .. tostring(errorData.motor_1_error))
	end
	if errorData.motor_2_error then
		table.insert(msgParts, "motor 2 error" .. tostring(errorData.motor_2_error))
	end
	if errorData.motor_3_error then
		table.insert(msgParts, "motor 3 error" .. tostring(errorData.motor_3_error))
	end
	if errorData.motor_4_error then
		table.insert(msgParts, "motor 4 error" .. tostring(errorData.motor_4_error))
	end
	if errorData.dribbler_error then
		table.insert(msgParts, "dribber error" .. tostring(errorData.dribbler_error))
	end
	if errorData.kicker_error then
		table.insert(msgParts, "kicker error" .. tostring(errorData.kicker_error))
	end
	if errorData.motorOverheatedError then
		table.insert(msgParts, "motor overheat" .. tostring(errorData.motorOverheatedError))
	end
	if errorData.motor_encoder_error then
		table.insert(msgParts, "motor encoder" .. tostring(errorData.motor_encoder_error))
	end
	if errorData.main_sensor_error then
		table.insert(msgParts, "main sensor" .. tostring(errorData.main_sensor_error))
	end
	if errorData.kicker_beak_beam_error then
		table.insert(msgParts, "kicker beam error" .. tostring(errorData.kicker_beak_beam_error))
	end
	if errorData.temperature then
		table.insert(msgParts, "temperature: " .. tostring(errorData.temperature))
	end
	return out .. table.concat(msgParts, ",")
end


function Error:_updateTask()
	//local errorFound = next(ErrorObserver.getErrorTable(self._robot)) ~= nil
	//if errorFound and World.Time == ErrorObserver.getLastRefChange() then
	//	log(self:errorMsg())
	//end
	return ErrorTask
end

return Error
