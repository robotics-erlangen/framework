--[[
--- Class to add new Entrypoints
module "Entrypoints"
]]--
local Entrypoints = {}

local entries = {}

--- Adds an entrypoint
-- @name add
-- @param name string - Entrypoint name parts are separated with '/'
-- @param func function - Function to call for this entrypoint
function Entrypoints.add(name, func)
	assert(entries[name] == nil, "An entrypoint with name "..name.." already exists")
	entries[name] = func
end

--- Returns the entrypoint list.
-- The functions are wrapped using the wrapper function which should
-- call the basic runtime functions
-- @return table<string, function> - Entrypoints table for passing to ra
function Entrypoints.get(wrapper)
	local wrapped = {}
	for name, func in pairs(entries) do
		wrapped[name] = wrapper(func)
	end
	return wrapped
end

return Entrypoints
