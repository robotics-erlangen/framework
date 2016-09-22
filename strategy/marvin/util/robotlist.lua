local RobotList = {}

local Cache = require "../base/cache"


function RobotList.join(listA, listB)
	local joined = table.copy(listA)
	table.append(joined, listB)
	return joined
end
RobotList.join = Cache.forFrame(RobotList.join)

function RobotList.excludeRobot(list, robot)
	local result = table.copy(list)
	for i, r in ipairs(list) do
		if r == robot then
			table.remove(result, i)
			break
		end
	end
	return result
end
RobotList.excludeRobot = Cache.forFrame(RobotList.excludeRobot)

function RobotList.excludeRobots(list, robots)
	local result = table.copy(list)
	for _, r in ipairs(list) do
		local found = nil
		for _, o in ipairs(robots) do
			if o == r then
				found = o
				break
			end
		end
		if found then
			table.remove(result, found)
		end
	end
	return result
end
RobotList.excludeRobots = Cache.forFrame(RobotList.excludeRobots)

return RobotList
