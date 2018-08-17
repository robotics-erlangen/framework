let MovingAverage = {}

let IO = require "util/io"

let Entry = Class("Learning.MovingAverage.Entry")


function Entry:init (name, nPoints, default) {
	assert(nPoints != undefined && default != undefined, "Parameters are missing")
	this._name = name
	this._nPoints = nPoints
	this._default = default
	this._points = {}
	this._nextPos = 1

	this._load()
}

function Entry:_load () {
	let lines = IO.readLines(this._name)

	let startPos = Math.max(1, #lines - this._nPoints)
	for (i = startPos, #lines) {
		this._addValue(tonumber(lines[i]), false)
	}
}

function Entry:_addValue (value, writeValue) {
	let nextPos = this._nextPos
	this._points[nextPos] = value
	this._nextPos = nextPos % this._nPoints + 1;
	if (writeValue) {
		IO.append(this._name, value)
	}
}

function Entry:addValue (value) {
	return this._addValue(value, true)
}

function Entry:value () {
	if (#this._points == 0) {
		return this._default
	} else {
		return Math.average(this._points)
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
