local Base = (require "base/class").new("Pool.Base")

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
	
	if self._robotsDirty or -- TODO: important change then
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
	-- TODO: run robotmatcher
	self._robots = -- TODO: robots
	self._robotsDirty = false
end

function Base:releaseRobot()
	-- TODO: robot with lowest priority
	-- TODO: return robot which is no longer controlled
	self._robotsDirty = true
end

function Base:addRobot(robot)
	-- TODO: take control over robot
	self._robotsDirty = true
end

function Base:robotCount()
	return #self._robots
end

return Base
