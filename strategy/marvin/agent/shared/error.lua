local Base = require "agent/base/behavior"
local Error = Class("Agent.Shared.Error",Base)

local ErrorTask = require "task/error"
local World = require "../base/world"
local ErrorObserver = require "observer/error"

function Error:check()
	return World.RefereeState == "Stop"
		and (World.Time - ErrorObserver.getLastRefChange()) < 3
		and ErrorObserver.getErrorTable(self._robot)
end

function Error:errorMsg()
	local out = tostring(self._robot.id) .. ": "
	local msgParts = {}
	local errorData = ErrorObserver.getErrorTable(self._robot)
	if errorData.motor_1_error then
		table.insert(msgParts, "motor 1 error")
	end
	if errorData.motor_2_error then
		table.insert(msgParts, "motor 2 error")
	end
	if errorData.motor_3_error then
		table.insert(msgParts, "motor 3 error")
	end
	if errorData.motor_4_error then
		table.insert(msgParts, "motor 4 error")
	end
	if errorData.dribbler_error then
		table.insert(msgParts, "dribber error")
	end
	if errorData.kicker_error then
		table.insert(msgParts, "kicker error")
	end
	if errorData.motorOverheatedError then
		table.insert(msgParts, "motor overheat")
	end
	if errorData.motor_encoder_error then
		table.insert(msgParts, "motor encoder")
	end
	if errorData.main_sensor_error then
		table.insert(msgParts, "main sensor")
	end
	if errorData.kicker_beak_beam_error then
		table.insert(msgParts, "kicker beam error")
	end
	if errorData.temperature then
		table.insert(msgParts, "temperature: " .. tostring(errorData.temperature))
	end
	return out .. table.concat(msgParts, ",")
end


function Error:_updateTask()
	local errorFound = next(ErrorObserver.getErrorTable(self._robot)) ~= nil
	if errorFound and World.Time == ErrorObserver.getLastRefChange() then
		log(self:errorMsg())
	end
	return ErrorTask
end

return Error
