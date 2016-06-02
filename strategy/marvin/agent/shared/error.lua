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
	if errorData.motor1Error then
		table.insert(msgParts, "motor 1 error")
	end
	if errorData.motor2Error then
		table.insert(msgParts, "motor 2 error")
	end
	if errorData.motor3Error then
		table.insert(msgParts, "motor 3 error")
	end
	if errorData.motor4Error then
		table.insert(msgParts, "motor 4 error")
	end
	if errorData.dribblerError then
		table.insert(msgParts, "dribber error")
	end
	if errorData.kickerError then
		table.insert(msgParts, "kicker error")
	end
	if errorData.motorOverheatedError then
		table.insert(msgParts, "motor overheat")
	end
	if errorData.motorEncoderError then
		table.insert(msgParts, "motor encoder")
	end
	if errorData.mainSensorError then
		table.insert(msgParts, "main sensor")
	end
	if errorData.temperature then
		table.insert(msgParts, "temperature: " .. tostring(self._error.temperature))
	end
	return out .. table.concat(msgParts, ",")
end


function Error:_updateTask()
	local errorFound = false
	for _, _ in pairs(ErrorObserver.getErrorTable(self._robot)) do
		errorFound = true
		break
	end
	if errorFound and World.Time == ErrorObserver.getLastRefChange() then
		log(self:errorMsg())
	end
	return ErrorTask
end

return Error
