local Base = (require "../base/class").new("Trajectory.Base") -- base class for trajectory planning

function Base:init(robot, ...)
	self._robot = robot
	self:_init(...)
end

function Base:_init(...)
	error("stub")
end

-- Data has to be in strategy coordinates!!! The trajectory module is responsible for the conversion
-- between strategy and global coordinates!
-- New data to use for updating, returns controllerInput and optionally additional data
function Base:update(...)
	error("Trajectory module not implemented")
	return controllerInput, ...
end

-- checks whether trajectory handler is currently able to handle the new data
-- or should be reseted
-- canHandle is guaranteed to be called only after update was called at least once
function Base:canHandle(...)
	error("Trajectory module not implemented")
end

return Base
