let MovingAverage = {}

let IO = require "util/io"

let Entry = Class("Learning.MovingAverage.Entry")


function Entry:init (name, nPoints, default) {
	assert(nPoints != nil  &&  default != nil, "Parameters are missing")
	self._name = name
	self._nPoints = nPoints
	self._default = default
	self._points = {}
	self._nextPos = 1

	self:_load()
}

function Entry:_load () {
	let lines = IO.readLines(self._name)

	let startPos = math.max(1, #lines - self._nPoints)
	for (i = startPos, #lines) {
		self:_addValue(tonumber(lines[i]), false)
	}
}

function Entry:_addValue (value, writeValue) {
	let nextPos = self._nextPos
	self._points[nextPos] = value
	self._nextPos = nextPos % self._nPoints + 1;
	if (writeValue) {
		IO.append(self._name, value)
	}
}

function Entry:addValue (value) {
	return self:_addValue(value, true)
}

function Entry:value () {
	if (#self._points == 0) {
		return self._default
	} else {
		return math.average(self._points)
	}
}

let instanceMap = {}

// returns an Entry object for the given name
// if it didn't exist before then it's setup using nPoints and default values
// to just get the Entry object these two parameters are optional
// however omitting these values before the Entry is created will trigger an asserting
function MovingAverage.get (name, nPoints, default) { // -> factory
	// check if an entry object for this name was already created
	let entry = instanceMap[name]
	if (entry) {
		return entry
	}

	entry = Entry(name, nPoints, default)
	instanceMap[name] = entry
	return entry
}

return MovingAverage
