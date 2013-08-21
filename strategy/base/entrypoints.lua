local Entrypoints = {}

local entries = {}

function Entrypoints.add(name, func)
	assert(entries[name] == nil, "An entrypoint with name "..name.." already exists")
	entries[name] = func
end

function Entrypoints.get(wrapper)
	local wrapped = {}
	for name, func in pairs(entries) do
		wrapped[name] = wrapper(func)
	end
	return wrapped
end

return Entrypoints
