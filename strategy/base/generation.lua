--[[
--- Provides robot generations specific classes
module "Robot.Generation"
]]--
local Robot = require "../base/robot"
local Generation = {
	Gen2012_2 = require "../base/robots/generation2012",
	Gen2014_3 = require "../base/robots/generation2014"
}

local constantsMt = { __index = Robot.constants }
for gen, cls in pairs(Generation) do
	setmetatable(cls.constants, constantsMt)
end

--- Creates a new generation specific robot object.
-- For these robot objects the constants table of robot is overlayed with generations specific constants.
-- This functions is a factory for constructing robots.
-- @name create
-- @param specs table - Specs as returned by getTeam()
-- @return Robot - Specific generation if available or generic robot object
function Generation.factory(specs, geometry)
	local robotGen = Generation["Gen" .. tostring(specs.year) .. "_" .. tostring(specs.generation)]
	if robotGen then
		return robotGen.create(specs, true, geometry)
	end
	return Robot.create(specs.id, true, geometry)
end

return Generation
