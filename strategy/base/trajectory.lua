--[[
--- Trajectory manager.
module "Trajectory"
]]--
local vis = require "../base/vis"
local Trajectory =  (require "../base/class").new("Trajectory") -- Trajectory manager

--- Initialises trajectory manager.
-- Must only be called by robot class!
-- @param robot Robot - robot to handle
function Trajectory:init(robot)
	self._robot = robot
	self._handler = nil
end

--- Update trajectory.
-- Resets handler if the trajectory type changes
-- @param handlerType Table - must be a subclass of Trajectory.Base
-- @param ... any - passed on to trajectory handler
function Trajectory:update(handlerType, ...)
	if not (self._handler and self._handler:instanceOf(handlerType) and self._handler:canHandle(...)) then
		self._handler = handlerType.create(self._robot)
	end
	local splines, moveDest, moveTime = self._handler:update(...)

	self._robot:setControllerInput(splines)
	vis.addPath("MoveTo", {self._robot.pos, moveDest}, vis.colors.whiteHalf)
	vis.addCircle("MoveTo", moveDest, self._robot.radius, vis.colors.yellowHalf, true)
	return moveDest, moveTime
end

return Trajectory
