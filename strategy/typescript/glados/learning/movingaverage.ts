local MovingAverage = {}

local IO = require "util/io"

local Entry = Class("Learning.MovingAverage.Entry")


function Entry:init(name, nPoints, default)
	assert(nPoints ~= nil and default ~= nil, "Parameters are missing")
	self._name = name
	self._nPoints = nPoints
	self._default = default
	self._points = {}
	self._nextPos = 1

	self:_load()
end

function Entry:_load()
	local lines = IO.readLines(self._name)

	local startPos = math.max(1, #lines - self._nPoints)
	for i = startPos, #lines do
		self:_addValue(tonumber(lines[i]), false)
	end
end

function Entry:_addValue(value, writeValue)
	local nextPos = self._nextPos
	self._points[nextPos] = value
	self._nextPos = nextPos % self._nPoints + 1;
	if writeValue then
		IO.append(self._name, value)
	end
end

function Entry:addValue(value)
	return self:_addValue(value, true)
end

function Entry:value()
	if #self._points == 0 then
		return self._default
	else
		return math.average(self._points)
	end
end

local instanceMap = {}

// returns an Entry object for the given name
// if it didn't exist before then it's setup using nPoints and default values
// to just get the Entry object these two parameters are optional
// however omitting these values before the Entry is created will trigger an asserting
function MovingAverage.get(name, nPoints, default) // -> factory
	// check if an entry object for this name was already created
	local entry = instanceMap[name]
	if entry then
		return entry
	end

	entry = Entry(name, nPoints, default)
	instanceMap[name] = entry
	return entry
end

return MovingAverage
