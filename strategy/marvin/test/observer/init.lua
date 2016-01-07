local Entrypoints = require "../base/entrypoints"

--- Loads every test
local Tests = {
	Ball = require "test/observer/ball",
	Goal = require "test/observer/goal",
	path = require "test/observer/path",
	Physics = require "test/observer/physics",
	Robot = require "test/observer/robot",
}


for name,s in pairs(Tests) do
	if type(s) ~= "table" then
		error("Invalid test! " .. name)
	end

	for fn,f in pairs(s) do
		if type(fn) == "string" and type(f) == "function" then
			local testname = fn:match("^test(.+)")
			if testname then
				Entrypoints.add("ObserverTest/" .. name .. "/" .. testname, f)
			end
		end
	end
end

return Tests
