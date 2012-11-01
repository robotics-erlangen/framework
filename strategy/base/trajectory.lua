--[[
--- Trajectory manager.
module "Trajectory"
]]--
local Trajectory =  (require "../base/class").new("Trajectory") -- Trajectory manager

--- Initialises trajectory manager.
-- Must only be called by robot class!
-- @param robot Robot - robot to handle
function Trajectory:init(robot)
	self.robot = robot
	self.handler = nil
end

--- Update trajectory.
-- Resets handler if the trajectory type changes
-- @param handlerType Table - must be a subclass of Trajectory.Base
-- @param ... any - passed on to trajectory handler
function Trajectory:update(handlerType, ...)
	if not (self.handler and self.handler:instanceOf(handlerType) and self.handler:canHandle(...)) then
		self.handler = handlerType.create(self.robot)
	end
	return self.handler:update(...)
end

return Trajectory
