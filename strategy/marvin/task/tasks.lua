--- Loads every task and publishes test functions
local Tasks = {
	Assistant = require "task/assistant",
	CatchBall = require "task/catchball",
	DirectPass = require "task/directpass",
	Keeper = require "task/keeper",
	ManMark = require "task/manmark",
	Mirror = require "task/mirror",
	MoveToPos = require "task/movetopos",
	ReceivePass = require "task/receivepass",
	Shoot = require "task/shoot"
}
local Test = require "util/test"


for name,s in pairs(Tasks) do
	if type(s) == "table" then
		if type(s.test) == "function" then -- check if task has test function
			s.test = Test.task(s.test)
			Entrypoints["tasks/" .. name] = function ()
				s.test()
			end
		end
	else
		error("Invalid task! " .. name)
	end
end

return Tasks
