--[[
--- Provides robot generations specific classes
module "Robot.Generation.Gen2014_3"
]]--
local Robot = require "../base/robot"
local Gen2014, Gen2014Mt = (require "../base/class").new("Robot.Generation.Gen2014_3", Robot)

Gen2014Mt.__tostring = Robot.tostring

--- Robot specific constants
-- @class table
-- @name Gen2014_3.constants
Gen2014.constants = {
	dribblerSpinupTime = 0.4
}

--- Chip wrapper
-- @name Gen2014_3:chip
-- @param distance number - Distance to chip
function Gen2014:chip(distance)
	-- TODO use distance
	self:shootChip(1)
end

--- Shoot wrapper
-- @name Gen2014_3:_shoot
-- @param speed number - Target shoot speed
function Gen2014:_shoot(speed)
	-- TODO: FIXME
	local speedRatio = speed/self.maxShotLinear*8
	local lim = math.bound(0, 162827-20000*speedRatio, 162827)
	local power = -(math.sqrt(3)*math.sqrt(lim)-741)/1000
	self:shootLinear(math.bound(0.1, power, 1))
end

return Gen2014
