--[[
--- Provides robot generations specific classes
module "Robot.Generation"
]]--
local Robot = require "../base/robot"
local Generation = {
	Gen2010_1 = require "../base/robots/generation2010",
	Gen2012_2 = require "../base/robots/generation2012"
}

local constantsMt = { __index = Robot.constants }
for gen, cls in pairs(Generation) do
	setmetatable(cls.constants, constantsMt)
end

--- Creates a new generation specific robot object.
-- @name create
-- @param specs table - Specs as returned by getTeam()
-- @return Robot - Specific generation if available or generic robot object
function Generation.create(specs, geometry)
	local robotGen = Generation["Gen" .. tostring(specs.year) .. "_" .. tostring(specs.generation)]
	if robotGen then
		return robotGen.create(specs, true, geometry)
	end
	return Robot.create(specs.id, true, geometry)
end

return Generation
