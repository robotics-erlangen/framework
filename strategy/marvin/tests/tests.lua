--- Loads every test
local Tests = {
	BallTest = require "tests/observer/ball",
	GameTest = require "tests/observer/game",
	GoalTest = require "tests/observer/goal",
	DirectPass = require "tests/task/directpass"
}

local coord = nil

for name,s in pairs(Tests) do
	if type(s) == "table" then
		for fn,f in pairs(s) do
			if type(fn) == "string" and type(f) == "function" then
				local testname = fn:match("^test(.+)")
				if testname then
					Entrypoints["tests/" .. name .. "/" .. testname] = f
				end
			end
		end
	else
		error("Invalid test! " .. name)
	end
end

return Tests
