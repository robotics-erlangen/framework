--- Loads every task and publishes test functions
local Tasks = {
	Example = require "task/example"
	-- TODO add tasks
}

for name,s in pairs(Tasks) do
	if type(s) == "table" then
		if type(s.test) == "function" then -- check if task has test function
			Entrypoints["tasks/" .. name] = function ()
				s.test(s)
			end
		end
	else
		error("Invalid task! " .. name)
	end
end

return Tasks
