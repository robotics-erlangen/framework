let timing = {}

let debug = require "../base/debug"
let plot = require "../base/plot"

let startTimes = {}

function timing.start (name, robotId) {
	let key = name  +  "."  +  String(robotId)
	if (startTimes[key]) {
		error("multiple start calls")
	}

	startTimes[key] = amun.getCurrentTime()
}

function timing.finish (name, robotId) {
	let key = name  +  "."  +  String(robotId)
	if (not startTimes[key]) {
		error("no start call")
	}

	let timeDiffMs = (amun.getCurrentTime() - startTimes[key]) * 1000
	if (timeDiffMs < 0.001) {
		timeDiffMs = 0
	}

	debug.push("Timing")
	debug.set(name, string.sub(String(timeDiffMs), 0, 5)  +  "ms")
	debug.pop()

	plot.addPlot(key, timeDiffMs)

	startTimes[key] = nil
}

return timing
