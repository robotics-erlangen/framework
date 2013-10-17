local UserInput = {}
local Coordinates = require "../base/coordinates"
local World = require "../base/world"
local amun = amun

function UserInput.update()
	local input = amun.getUserInput()
	if input.radio_command then
		for _, robot in pairs(World.FriendlyRobotsById) do
			robot:_updateUserControl(nil) -- clear
		end
		for _, cmd in ipairs(input.radio_command) do
			local robot = World.FriendlyRobotsById[cmd.id]
			if robot then
				robot:_updateUserControl(cmd.command)
			end
		end
	end
end

return UserInput
