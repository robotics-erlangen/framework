local RobotMatcher = {}
local Cache = require "../base/cache"

-- conditions that have to be satisfied for every position have to be used to filter the robot list
-- the matches are generated incrementally
-- conditions are per position, a condition is guaranteed that all positions before the current one are already setup
-- reuse conditions list whenever possible
function RobotMatcher.match(messages, robots, robotCount, conditions, lastMatching)
	if #robots < robotCount then
		return
	elseif robotCount == 0 then
		return {}
	end
	-- TODO: handle hysteresis
	conditions = conditions or {}
	
	local bestRating = 0
	local bestMatch = nil
	
	local match = {}
	local usedRobots = { nil, nil, nil, nil, nil, nil }
	local iterators = { nil } -- init first index
	local itc = 1
	
	local partialRatings = { }
	partialRatings[0] = 1 -- start rating
	
	while itc > 0 do
		local curIt = iterators[itc]
		-- clear robot pointed to by current iterator
		-- a new iterator is nil and didn't use a robot before
		if curIt ~= nil then
			usedRobots[curIt] = nil
		end
		
		repeat -- get next assignment possibility for current depth
			curIt = next(robots, curIt) -- next robot from robots list
			-- a robot can only be assigned once
			if curIt and not usedRobots[curIt] then
				usedRobots[curIt] = true
				match[itc] = robots[curIt]
				iterators[itc] = curIt
				break
			end
		until curIt == nil
		
		-- get rating of parent assignment
		local rating = partialRatings[itc - 1]
		if curIt == nil or rating < bestRating then
			-- no more possiblities to test for current depth or no chance for a better assignment
			itc = itc - 1 -- backtrack one step
		else
			local cond = conditions[itc]
			if cond then
				-- a condition function must always return a value between 0 and 1
				-- thus rating is monotonically decreasing
				-- that is if rating is <= the best rating we have, then it will never be better than that one
				if rating <= bestRating then
					break
				end
				local task = cond(match)
				local priorityMessages, notifications = messages:split(task:robot())
				local taskRating = task:rate(priorityMessages, notifications)
				assert(taskRating >= 0 and taskRating <= 1, "Invalid task rating!")
				rating = rating * taskRating
			end
			
			-- only look at possibly better ratings
			if rating > bestRating then
				if itc == robotCount then
					bestRating = rating
					bestMatch = table.copy(match)
				elseif itc < robotCount then
					partialRatings[itc] = rating -- save current rating
					itc = itc + 1
					iterators[itc] = nil -- reset iterator
				end
			end
		end
	end
	
	if bestMatch == nil then
		bestMatch = {}
		for _, robot in pairs(robots) do
			table.insert(bestMatch, robot)
		end
		table.truncate(bestMatch, robotCount)
	end
	
	return bestMatch, bestRating
end
RobotMatcher.match = Cache.forFrame(RobotMatcher.match)

return RobotMatcher
