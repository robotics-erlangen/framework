local TaskTests = {
	DirectPass = require "test/task/directpass",
	Passing = require "test/task/passing"
}

local coord = nil
local function callWrapper(play)
	return function ()
		if not coord then
			local Coordinator = require "control/coordinator"
			coord = Coordinator.create()
			coord:test(play)
		end
		coord:run()
	end
end

local Tests = {}
for name, play in pairs(TaskTests) do
	Tests["test" .. name] = callWrapper(play)
end

return Tests
