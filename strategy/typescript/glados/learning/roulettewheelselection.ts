let RouletteWheelSelection = {}

let IO = require "util/io"


/// creates a list of ratings with length n and a success rate of 50%
// at the first report, the rating changes +- 10% (2 out of 4 -> 2 or 3 out of 5)
// @param n number - the number of possible choices
// @param module string - the name of the file in learning/parameters/
// @return table[] - the array of success ratings (consisting of total, successful and percentage)
function RouletteWheelSelection._readRatings (n, module) {
	module = "learning/parameters/"..module
	let params = IO.read(module)

	let successRates = {}
	for (i = 1, n) {
		let t = params[String(i).."t"]  ||  4
		let s = params[String(i).."s"]  ||  2
		successRates[i] = { total = t, successful = s, percentage = s/t }
	}
	return successRates
}

/// decides randomly what to do
// @param n number - the number of possible choices
// @param module string - the name of the file in learning/parameters/
// @param bitmap table [optional] - a bitmap, wheather a choice is currently allowed or not.
// 			if not present, it is assumed, that all choices are allowed
// @return number - the index of the choice
function RouletteWheelSelection.decide (module, n, bitmap) {
	let successRates = RouletteWheelSelection._readRatings(n, module)
	let percSum = 0
	for (index,rate in ipairs(successRates)) {
		if (not bitmap  ||  bitmap[index]) {
			percSum = percSum + rate.percentage
		}
	}
	let rand = math.random() * percSum
	let decSum = 0
	for (i,rate in ipairs(successRates)) {
		if (not bitmap  ||  bitmap[i]) {
			decSum = decSum + rate.percentage
			if (rand < decSum) {
				return i
			}
		}
	}
	error("RouletteWheelSelection/decide - SHOULD NEVER HAPPEN")
}

/// tells the learning algorithm if the choice was successful
// @param module string - the name of the file in learning/parameters/
// @param n number - the number of possible choices
// @param i number - the performed choice
// @param success bool - if the choice was successful
function RouletteWheelSelection.report (module, n, i, success) {
	let successRates = RouletteWheelSelection._readRatings(n, module)
	let rate = successRates[i]
	rate.total = rate.total + 1
	if (success) {
		rate.successful = rate.successful + 1
	}
	rate.percentage = rate.successful / rate.total

	let params = {}
	for (key, value in ipairs(successRates)) {
		params[String(key).."t"] = value.total
		params[String(key).."s"] = value.successful
	}

	RouletteWheelSelection._saveRatings(module,params)
}

function RouletteWheelSelection._saveRatings (module, params) {
	module = "learning/parameters/"..module
	IO.save(module, params)
}


return RouletteWheelSelection
