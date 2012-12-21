local Base = (require "../base/class").new("Pool.Base")
local RobotMatcher = require "control/robotmatcher"

function Base:init(tm, attackers, defenders)
	self._taskmanager = tm
	self._robotsDirty = true
	self:_init(attackers, defenders)
end

function Base:run()
	if not self._robots then
		error("Initialization fucked up.")
	end
	-- TODO: prepare logging
	
	if self._robotsDirty then -- or -- TODO: important change then
		self:assignRobots(self._robots)
	end
	
	self:_run()
	-- TODO: finish logging
end

function Base:_run()
	error("stub")
end

function Base:assignRobots(robots)
	error("stub")
	-- generate conditions for robot assignment
end

function Base:_assignRobots(robots, conditions)
	self._robots = Robotmatcher.match(robots, #robots, conditions)
	self._robotsDirty = false
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
