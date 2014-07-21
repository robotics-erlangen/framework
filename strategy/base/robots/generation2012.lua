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
	self:shootChip(1) -- chip is too powerless
end

--- Shoot wrapper
-- @name Gen2012_2:_shoot
-- @param speed number - Target shoot speed
function Gen2012:_shoot(speed)
	local speedRatio = speed/self.maxShotLinear*8
	local lim = math.bound(0, 162827-20000*speedRatio, 162827)
	local power = -(math.sqrt(3)*math.sqrt(lim)-741)/1000
	if self.id == 7 then
		power = 0.0135*speed*speed+0.0723*speed+0.181
	end
	self:shootLinear(math.bound(0.1, power, 1))
end

return Gen2012
