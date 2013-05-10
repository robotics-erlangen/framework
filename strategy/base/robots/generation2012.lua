--[[
--- Provides robot generations specific classes
module "Robot.Generation.Gen2012_2"
]]--
local Robot = require "../base/robot"
local Gen2012, Gen2012Mt = (require "../base/class").new("Robot.Generation.Gen2012_2", Robot)

Gen2012Mt.__tostring = Robot.tostring

--- Robot specific constants
-- @class table
-- @name Gen2012_2.constants
Gen2012.constants = {
	dribblerSpinupTime = 0.4
}

--- Chip wrapper
-- @name Gen2012_2:chip
-- @param distance number - Distance to chip
function Gen2012:chip(distance)
	if self.maxShotChip == 0 then
		self:pass(distance)
		self:setDribblerSpeed(1)
	else
		self:shootChip(1) -- chip is too powerless
	end
end

--- Shoot wrapper
-- @name Gen2012_2:_shoot
-- @param speed number - Target shoot speed
function Gen2012:_shoot(speed)
	local power = (speed/self.maxShotLinear)^1.5*0.9+0.1
	self:shootLinear(math.bound(0.1, power, 1))
end

return Gen2012
