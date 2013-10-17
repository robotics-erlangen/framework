local UserInput = {}
local Coordinates = require "../base/coordinates"
local World = require "../base/world"
local amun = amun

local controlInput = {}

function UserInput.update()
	local input = amun.getUserInput()
	if input.radio_command then
		controlInput = {}
		for _, cmd in ipairs(input.radio_command) do
			local robot = World.FriendlyRobotsById[cmd.id]
			if robot then
				local command = cmd.command
				local v = Vector.create(command.v_s, command.v_f)
				local omega = command.omega
				if command.direct then
					v = v:rotate(robot.dir - math.pi/2)
				end
				v = Coordinates.toLocal(v)
				controlInput[robot] = { speed = v, omega = omega,
					kickStyle = command.kick_style, kickPower = command.kick_power,
					dribblerSpeed = command.dribbler }
			end
		end
	end
end

function UserInput.getControlInput(robot)
	if robot == nil then
		return controlInput
	end
	return controlInput[robot]
end

return UserInput
