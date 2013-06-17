--[[
--- Provides robot generations specific classes
module "Robot.Generation.Gen2010_1"
]]--
local Robot = require "../base/robot"
local Gen2010, Gen2010Mt = (require "../base/class").new("Robot.Generation.Gen2010_1", Robot)

Gen2010Mt.__tostring = Robot.tostring

--- Robot specific constants
-- @class table
-- @name Gen2010_1.constants
Gen2010.constants = {
	dribblerSpinupTime = math.huge
}

--- Chip wrapper
-- @name Gen2010_1:chip
-- @param distance number - Distance to chip
function Gen2010:chip(distance) -- not fixable
	local power = distance / 3
	self:shootChip(math.bound(0.1, power, 1))
end

--- Shoot wrapper
-- @name Gen2010_1:_shoot
-- @param speed number - Target shoot speed
function Gen2010:_shoot(speed) -- not fixable
	local speedRatio = speed/self.maxShotLinear*8
	local lim = math.bound(0, 162827-20000*speedRatio, 162827)
	local power = -(math.sqrt(3)*math.sqrt(lim)-741)/1000
	self:shootLinear(math.bound(0.1, power, 1))
end

return Gen2010
