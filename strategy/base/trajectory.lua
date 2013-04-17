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
-- Resets handler if the trajectory type changes.
-- Values passed to and returned from the trajectory handler <strong>must</strong> use strategy coordinates. The handler is responsible for doing any neccessary conversions!
-- The handler has to return a protobuf.robot.Spline, Vector, number (controllerInput, moveDest, moveTime).
-- @param handlerType Table - must be a subclass of Trajectory.Base
-- @param ... any - passed on to trajectory handler
-- @return Vector, number - move destination and time as returned by the trajectory handler
function Trajectory:update(handlerType, ...)
	if not handlerType:instanceOf(Trajectory.Base) then
		error("Trajectory module must derive from Trajectory.Base")
	end
	if not (self._handler and self._handler:instanceOf(handlerType) and self._handler:canHandle(...)) then
		self._handler = handlerType.create(self._robot)
	end
	local splines, moveDest, moveTime = self._handler:update(...)

	self._robot:setControllerInput(splines)
	vis.addPath("MoveTo", {self._robot.pos, moveDest}, vis.colors.whiteHalf)
	vis.addCircle("MoveTo", moveDest, self._robot.radius, vis.colors.yellowHalf, true)
	return moveDest, moveTime
end


-- base class for trajectory planning
Trajectory.Base = (require "../base/class").new("Trajectory.Base")

function Trajectory.Base:init(robot, ...)
	self._robot = robot
	self:_init(...)
end

function Trajectory.Base:_init(...)
	error("stub")
end

-- Data has to be in strategy coordinates!!! The trajectory module is responsible for the conversion
-- between strategy and global coordinates!
-- New data to use for updating, returns controllerInput, moveDest and moveTime
function Trajectory.Base:update(...)
	error("Trajectory module not implemented")
	return controllerInput, moveDest, moveTime
end

-- checks whether trajectory handler is currently able to handle the new data
-- or should be reseted
-- canHandle is guaranteed to be called only after update was called at least once
function Trajectory.Base:canHandle(...)
	error("Trajectory module not implemented")
end

return Trajectory
