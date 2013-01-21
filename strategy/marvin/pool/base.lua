local Base = (require "../base/class").new("Pool.Base")
local RobotMatcher = require "control/robotmatcher"
local debug = require "../base/debug"

function Base:init(tm, attackers, defenders)
	self._taskmanager = tm
	self._robotsDirty = true
	self._tasks = {}
	self:_init(attackers, defenders)
end

function Base:run()
	if not self._robots then
		error("Initialization fucked up.")
	end
	
	debug.pushtop("Pool-"..self.classNameShort)
	debug.set(nil, "")
	
	-- update robot assignment
	if self._robotsDirty then -- or -- TODO: important change then
		self:assignRobots(self._robots)
	end
	
	debug.push("Robots")
	for i, robot in ipairs(self._robots) do
		debug.set("Pos " .. tostring(i), robot.id)
	end
	debug.pop()
	
	-- update tasks
	self:_run()
	-- apply tasks
	self:_assignTasks()

	debug.pop()
end

function Base:_run()
	error("stub")
end

function Base:_assignTasks()
	for _, task in pairs(self._tasks) do
		if not self._taskmanager:task(task:robot()) then
			self._taskmanager:assign(task)
		end
	end
end

function Base:assignRobots(robots)
	error("stub")
	-- generate conditions for robot assignment
end

function Base:_assignRobots(robots, conditions)
	self._robots = RobotMatcher.match(robots, #robots, conditions)
	self._robotsDirty = false
	
	--regnerate tasks list
	local tasksByRobot = {}
	for _, task in pairs(self._tasks) do
		tasksByRobot[task:robot()] = task
	end
	self._tasks = {}
	for i, robot in pairs(self._robots) do
		self._tasks[i] = tasksByRobot[robot]
	end
end

function Base:releaseRobot()
	-- TODO: robot with lowest priority
	local lastRobot = table.remove(self._robots)
	self._robotsDirty = true
	return lastRobot
end

function Base:addRobot(robot)
	table.insert(self._robots, robot)
	self._robotsDirty = true
end

function Base:removeHiddenRobots()
	for i, robot in pairs(self._robots) do
		if not robot.isVisible then
			self._robots[i] = nil
			self._robotsDirty = true
		end
	end
end

function Base:robots()
	return self._robots
end

return Base
