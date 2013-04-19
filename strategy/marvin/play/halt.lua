local Base = require "play/base"
local Halt = (require "../base/class").new("Play.Halt", Base)
local HaltTask = require "task/halt"
local World = require "../base/world"

Halt.weight = 100
Halt.timeout = 3600 -- run "forever"
Halt.startState = "Halt"
Halt.maxRating = Base.rating.referee

function Halt:_init()
end

function Halt:_selectRobots(poolRobots)
	-- halt every robot that we are controlling
	local robots = {}
	for _, r in pairs(poolRobots) do
		table.append(robots, r)
	end
	
	return robots
end

function Halt:rateHalt()
	if World.RefereeState == "Halt" then
		return Base.rating.referee
	else
		return Base.rating.no
	end
end

function Halt:prepareHalt()
	self._tasks = {}
	for i, r in pairs(self._robots) do
		self._tasks[i] = HaltTask.create(r)
	end
end

return Halt
