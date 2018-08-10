local timing = {}

local debug = require "../base/debug"
local plot = require "../base/plot"

local startTimes = {}

function timing.start(name, robotId)
	local key = name .. "." .. tostring(robotId)
	if startTimes[key] then
		error("multiple start calls")
	end

	startTimes[key] = amun.getCurrentTime()
end

function timing.finish(name, robotId)
	local key = name .. "." .. tostring(robotId)
	if not startTimes[key] then
		error("no start call")
	end

	local timeDiffMs = (amun.getCurrentTime() - startTimes[key]) * 1000
	if timeDiffMs < 0.001 then
		timeDiffMs = 0
	end

	debug.push("Timing")
	debug.set(name, string.sub(tostring(timeDiffMs), 0, 5) .. "ms")
	debug.pop()

	plot.addPlot(key, timeDiffMs)

	startTimes[key] = nil
end

return timing
