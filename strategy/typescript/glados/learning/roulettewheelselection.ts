local RouletteWheelSelection = {}

local IO = require "util/io"


//- creates a list of ratings with length n and a success rate of 50%
// at the first report, the rating changes +- 10% (2 out of 4 -> 2 or 3 out of 5)
// @param n number - the number of possible choices
// @param module string - the name of the file in learning/parameters/
// @return table[] - the array of success ratings (consisting of total, successful and percentage)
function RouletteWheelSelection._readRatings(n, module)
	module = "learning/parameters/"..module
	local params = IO.read(module)

	local successRates = {}
	for i = 1, n do
		local t = params[tostring(i).."t"] or 4
		local s = params[tostring(i).."s"] or 2
		successRates[i] = { total = t, successful = s, percentage = s/t }
	end
	return successRates
end

//- decides randomly what to do
// @param n number - the number of possible choices
// @param module string - the name of the file in learning/parameters/
// @param bitmap table [optional] - a bitmap, wheather a choice is currently allowed or not.
// 			if not present, it is assumed, that all choices are allowed
// @return number - the index of the choice
function RouletteWheelSelection.decide(module, n, bitmap)
	local successRates = RouletteWheelSelection._readRatings(n, module)
	local percSum = 0
	for index,rate in ipairs(successRates) do
		if not bitmap or bitmap[index] then
			percSum = percSum + rate.percentage
		end
	end
	local rand = math.random() * percSum
	local decSum = 0
	for i,rate in ipairs(successRates) do
		if not bitmap or bitmap[i] then
			decSum = decSum + rate.percentage
			if rand < decSum then
				return i
			end
		end
	end
	error("RouletteWheelSelection/decide - SHOULD NEVER HAPPEN")
end

//- tells the learning algorithm if the choice was successful
// @param module string - the name of the file in learning/parameters/
// @param n number - the number of possible choices
// @param i number - the performed choice
// @param success bool - if the choice was successful
function RouletteWheelSelection.report(module, n, i, success)
	local successRates = RouletteWheelSelection._readRatings(n, module)
	local rate = successRates[i]
	rate.total = rate.total + 1
	if success then
		rate.successful = rate.successful + 1
	end
	rate.percentage = rate.successful / rate.total

	local params = {}
	for key, value in ipairs(successRates) do
		params[tostring(key).."t"] = value.total
		params[tostring(key).."s"] = value.successful
	end

	RouletteWheelSelection._saveRatings(module,params)
end

function RouletteWheelSelection._saveRatings(module, params)
	module = "learning/parameters/"..module
	IO.save(module, params)
end


return RouletteWheelSelection
