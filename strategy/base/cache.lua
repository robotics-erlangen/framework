local Cache = {}

local cleanup = {}
local nilObj = {}

local function getFromCache(cached, params)
	local entry = cached[#params]
	for i = 1, #params do
		if params[i] == nil then
			params[i] = nilObj
		end
		entry = cached[params[i]]
		if entry == nil then
			return nil
		end
	end
	return entry
end

local function setInCache(cached, params, result)
	local entry = cached[#params]
	if not entry then
		entry = {}
		cached[#params] = entry
	end
	local pcount = #params
	for i = 1, pcount do
		if params[i] == nil then
			params[i] = nilObj
		end
		entry = cached[params[i]]
		if i == pcount then
			cached[params[i]] = result
		elseif entry == nil then
			entry = {}
			cached[params[i]] = entry
		end
	end
end

local function makeCached(f, keepForever)
	local cached = {}
	if keepForever then
		-- drop values if keys are no longer existing, as cache values can no longer be accessed
		setmetatable(cached, {__mode = "k"})
	else
		table.insert(cleanup,
			function()
				cached = {}
			end
		)
	end
	return function(...)
		local result = getFromCache(cached, {...})
		if not result then
			result = { f(...) }
			setInCache(cached, {...}, result)
		end
		return unpack(result)
	end
end

function Cache.forFrame(f)
	return makeCached(f, false)
end

function Cache.forever(f)
	return makeCached(f, true)
end

function Cache.resetFrame()
	for i = 1, #cleanup do
		cleanup[i]()
	end
end

return Cache
