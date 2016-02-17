local RouletteWheelSelection = {}

local IO = require "util/io"


--- creates a list of ratings with length n and a success rate of 50%
-- at the first report, the rating changes +- 10% (2 out of 4 -> 2 or 3 out of 5)
-- @param n number - the number of possible choices
-- @param module string - the name of the file in learning/parameters/
-- @return table[] - the array of success ratings (consisting of total, successful and percentage)
function RouletteWheelSelection.init(n, module)
	local params = IO.read(module)

	local successRates = {}
	for i = 1, n do
		local t = params[tostring(i).."t"] or 4
		local s = params[tostring(i).."s"] or 2
		successRates[i] = { total = t, successful = s, percentage = s/t }
	end
	return successRates
end

--- decides randomly what to do
-- @param successRates table[] - the array of success ratings created in init()
-- @return number - the index of the choice
function RouletteWheelSelection.decide(successRates)
	local n = #successRates
	local percSum = 0
	for _,rate in ipairs(successRates) do
		percSum = percSum + rate.percentage
	end
	local rand = math.random() * percSum
	local decSum = 0
	for i,rate in ipairs(successRates) do
		decSum = decSum + rate.percentage
		if rand < decSum then
			return i
		end
	end
	error("RouletteWheelSelection/decide - SHOULD NEVER HAPPEN")
end

--- tells the learning algorithm if the choice was successful
-- @param successRates table[] - the array of success ratings created in init()
-- @param i number - the performed choice
-- @param success bool - if the choice was successful
-- @param module string - the name of the file in learning/parameters/
function RouletteWheelSelection.report(successRates, i, success, module) 
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
	
	IO.save(module, params)
end


return RouletteWheelSelection
