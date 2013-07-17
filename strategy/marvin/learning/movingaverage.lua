local MovingAverage = {}

local IO = require "util/io"

local modulePoints = {}
local modulePoss = {}
local moduleDefaults = {}

function MovingAverage.init(module, nPoints, default)
	nPoints = nPoints or 5
	default = default or 0
	
	local points = {}
	
	local lines = IO.readLines(module)
	local startpos = #lines - nPoints
	for i = 1, nPoints do
		if startpos + i > 0 then
			points[i] = lines[startpos + i]
		end
	end
	
	modulePoints[module] = points
	modulePoss[module] = 1
	moduleDefaults[module] = default
end

function MovingAverage.getValue(module) 
	local points = modulePoints[module]
	if #points == 0 then
		return moduleDefaults[module]
	end
		
	local sum = 0
	for _,p in ipairs(points) do
		sum = sum + p	
	end
	
	return sum/(#points)
end

function MovingAverage.adjustValue(module, value) 
	modulePoints[module][modulePoss[module]] = value
	IO.append(module, value)
end


return MovingAverage
