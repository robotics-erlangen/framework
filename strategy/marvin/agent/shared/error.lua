local Base = require "agent/base/behavior"
local Error = Class("Agent.Shared.Error",Base)

local ErrorTask = require "task/error"
local World = require "../base/world"

local startTime
local oldRefereeState
function Error:check()
	if oldRefereeState ~= World.RefereeState then
		startTime = World.Time
		oldRefereeState = World.RefereeState
	end
	if self._robot.radioResponse and self._robot.radioResponse.error_present then
		--we have an error, save it for debugging purposes
		if self._robot.radioResponse.ExtendedError then
			self._error = self._robot.radioResponse.ExtendedError
		else
			self._error = {}
		end
	end
	return World.RefereeState == "Stop" 
		and (World.Time-startTime) < 3
		and self._error
end

function Error:errorMsg()
	local out = tostring(self._robot.id)..": "
	local comma = ""
	if self._error.motor_1_error then 
		out = out .. comma .."motor 1 error"
		comma = ", "
	end
	if self._error.motor_2_error then
		out = out .. comma .."motor 2 error"
		comma = ", "
	end
	if self._error.motor_3_error then
		out = out .. comma .. "motor 3 error"
		comma = ", "
	end
	if self._error.motor_4_error then
		out = out .. comma .. "motor 4 error"
		comma = ", "
	end
	if self._error.dribbler_error then 
		out = out .. comma .. "dribber error"
		comma = ", "
	end
	if self._error.kicker_error then
		out = out .. comma .. "kicker error"
		comma = ", "
	end
	if self._error.motor_overheated_error then
		out = out .. comma .. "motor overheat"
		comma = ", "
	end
	if self._error.motor_encoder_error then
		out = out .. comma .. "motor encoder"
		comma= ", "
	end
	if self._error.main_sensor_error then
		out = out .. comma .. "main sensor"
		comma = ", "
	end
	if self._error.temperature then
		out = out .. comma .. "temperature: "..tostring(self._error.temperature)
		comma = ", "
	end
	return out
end


function Error:_updateTask()
	local errorFound = false
	for _,_ in pairs(self._error) do 
		errorFound = true
		break
	end
	if errorFound and World.Time == startTime then
		log(self:errorMsg())
	end
	return ErrorTask
end

function Error:_stop()
	self._error = nil
end

return Error
