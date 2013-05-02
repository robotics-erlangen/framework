local Base = (require "../base/class").new("Pool.Base")
local RobotMatcher = require "control/robotmatcher"
local debug = require "../base/debug"

Base.robotLimit = math.huge

function Base:init(tm)
	self._taskmanager = tm
	self._robotsDirty = true
	self._robots = {}
	self._tasks = {}
end

function Base:run()
	debug.pushtop("Pool-"..self.classNameShort)
	debug.set(nil, "")
	
	-- update robot assignment
	if self._robotsDirty then -- or -- TODO: important change then
		self:_assignRobots()
	end
	
	debug.push("Robots")
	for i, robot in ipairs(self._robots) do
		debug.set("Pos " .. tostring(i), robot.id)
	end
	debug.pop()
	
	-- update tasks
	self:_updateTasks()
	-- apply tasks
	self:_assignTasks()

	debug.pop()
end

function Base:_updateTasks()
	error("stub")
end

function Base:_assignTasks()
	for _, task in pairs(self._tasks) do
		if not self._taskmanager:task(task:robot()) then
			self._taskmanager:assign(task)
		end
	end
end

function Base:_assignRobots()
	self._robots = RobotMatcher.match(self._taskmanager, self._robots, #self._robots, self._conditions)
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

--- Test whether robot should be kept by cleanupRobots.
-- May be overwritten by subclasses
-- @param robot Robot - robot to test
-- @return bool - Whether to keep robot or not
function Base:_keepRobot(robot)
	return robot.isVisible
end

-- remove robots we no longer want to keep
function Base:cleanupRobots()
	local robots = {}
	for _, robot in pairs(self._robots) do
		if self:_keepRobot(robot) then
			table.insert(robots, robot)
		end
	end
	while #robots > self.robotLimit do
		table.remove(robots)
	end
	if #robots ~= #self._robots then
		self._robotsDirty = true
		self._robots = robots
	end
end

function Base:takeRobot(robots)
	if #self._robots >= self.robotLimit then
		return
	end
	
	local robot = self:_takeRobot(robots)
	if robot then
		table.insert(self._robots, robot)
		self._robotsDirty = true
	end
	return robot
end

function Base:_takeRobot(robots)
	error("stub")
end

function Base:robots()
	return self._robots
end

return Base
