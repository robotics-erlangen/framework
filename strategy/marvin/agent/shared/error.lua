local Base = require "agent/base/behavior"
local Error = Class("Agent.Shared.Error",Base)

local ErrorTask = require "task/error"
local World = require "../base/world"
local ErrorObserver = require "observer/error"

function Error:check()
	return World.RefereeState == "Stop"
		and (World.Time-ErrorObserver.getLastRefChange()) < 3
		and ErrorObserver.getErrorTable(self._robot)
end

function Error:errorMsg()
	local out = tostring(self._robot.id)..": "
	local table = {}
	local _error = ErrorObserver.getErrorTable(self._robot)
	if _error.motor_1_error then
		table.insert(table,"motor 1 error")
	end
	if _error.motor_2_error then
		table.insert(table,"motor 2 error")
	end
	if _error.motor_3_error then
		table.insert(table,"motor 3 error")
	end
	if _error.motor_4_error then
		table.insert(table, "motor 4 error")
	end
	if _error.dribbler_error then
		table.insert(table,"dribber error")
	end
	if _error.kicker_error then
		table.insert(table,"kicker error")
	end
	if _error.motor_overheated_error then
		table.insert(table, "motor overheat")
	end
	if _error.motor_encoder_error then
		table.insert(table,"motor encoder")
	end
	if _error.main_sensor_error then
		table.insert(table,"main sensor")
	end
	if _error.temperature then
		table.insert(table, "temperature: "..tostring(self._error.temperature))
	end
	return out..table.concat(table,",");
end


function Error:_updateTask()
	local errorFound=false
	for _,_ in pairs(ErrorObserver.getErrorTable(self._robot)) do
		errorFound=true
		break
	end
	if errorFound and World.Time == ErrorObserver.getLastRefChange() then
		log(self:errorMsg())
	end
	return ErrorTask
end

return Error
