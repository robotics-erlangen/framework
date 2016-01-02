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
	for i, r in pairs(list) do
		if r == robot then
			table.remove(result, i)
			break
		end
	end
	return result
end
RobotList.excludeRobot = Cache.forFrame(RobotList.excludeRobot)

return RobotList
