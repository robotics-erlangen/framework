local IO = {}

require "../base/amun"

local pathToStrategy = amun.strategyPath.."/learning/parameters/"


function IO.read(module)
	local filename = pathToStrategy..module
	local params = {}
	local ok, iterator = pcall(io.lines, filename)
	if not ok == LUA_OK then
		return {}
	end
	for line in iterator do
		local it = string.gmatch(line, "%w+")
		local key = it(1)
		local value = tonumber(it(2))
		params[key] = value
	end
	return params
end

function IO.save(module, params)
	local filename = pathToStrategy..module
	local f = io.open(filename, "w")
	for key, value in pairs(params) do
		local line = key.." "..tostring(value).."\n"
		f:write(line)
	end
	f:close(filename)
end

return IO
