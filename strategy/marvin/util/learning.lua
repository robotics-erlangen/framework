local Learning = {}


--- creates a list of ratings with length n and a success rate of 50%
-- at the first report, the rating changes +- 10% (2 out of 4 -> 2 or 3 out of 5)
-- @param n number - the number of possible choices
-- @return table[] - the array of success ratings (consisting of total, successful and percentage)
function Learning.init(n)
	local successRates = {}
	for i = 1, n do
		successRates[i] = { total = 4, successful = 2, percentage = 0.5 }
	end
	return successRates
end

--- decides randomly what to do
-- @param successRates table[] - the array of success ratings created in init()
-- @return number - the index of the choice
function Learning.decide(successRates)
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
	error("Learning/decide - SHOULD NEVER HAPPEN")
end

--- tells the learning algorithm if the choice was successful
-- @param successRates table[] - the array of success ratings created in init()
-- @param i number - the performed choice
-- @param success bool - if the choice was successful
function Learning.report(successRates, i, success) 
	local rate = successRates[i]
	rate.total = rate.total + 1
	if success then
		rate.successful = rate.successful + 1
	end
	rate.percentage = rate.successful / rate.total
end


return Learning
