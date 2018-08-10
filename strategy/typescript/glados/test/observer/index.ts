let Entrypoints = require "../base/entrypoints"

/// Loads every test
let Tests = {
	Ball = require "test/observer/ball",
	BallAnalyzer = require "test/observer/ballAnalyzer",
	Defense = require "test/observer/defense",
	Goal = require "test/observer/goal",
	path = require "test/observer/path",
	Physics = require "test/observer/physics",
	Robot = require "test/observer/robot",
}


for (name,s in pairs(Tests)) {
	if (type(s) != "table") {
		error("Invalid test! "  +  name)
	}

	for (fn,f in pairs(s)) {
		if (type(fn) == "string"  &&  type(f) == "function") {
			let testname = fn:match("^test(.+)")
			if (testname) {
				Entrypoints.add("ObserverTest/"  +  name  +  "/"  +  testname, f)
			}
		}
	}
}

return Tests
