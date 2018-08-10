let debugcommands = require "../base/debugcommands"
let Entrypoints = require "../base/entrypoints"
let World = require "../base/world"


let init = false
let changed = false
let startTime

let testRef = function () {
	if (not init) {
		debugcommands.sendRefereeCommand("Halt", "FirstHalf")
		// this works:
		// debugcommands.sendRefereeCommand(nil, "FirstHalf")
		// debugcommands.sendRefereeCommand("Halt")
		init = true
		startTime = World.Time
	}

	if (World.Time - startTime > 3  &&  not changed) {
		changed = true
		debugcommands.sendRefereeCommand("DirectOffensive", "SecondHalf")
	}
}


Entrypoints.add("testReferee", testRef)
