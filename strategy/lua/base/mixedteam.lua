local mixedteam = {}

local sendMixedTeamInfo = amun.sendMixedTeamInfo


local function decodeLocation(loc)
	return Vector(loc.y / 1000, -loc.x / 1000)
end

local function decodeDirection(dir)
	return dir + math.pi/2
end

-- convert ssl::TeamInfo to internal representation
function mixedteam.decodeData(data)
	local robotInfo = {}

	for _, robotPlan in ipairs(data) do
		--debug.set("dt", robotPlan)
		local plan = {}
		if robotPlan.role then
			plan.role = robotPlan.role
		else
			plan.role = "Default"
		end

		if robotPlan.nav_target and robotPlan.nav_target.loc then
			plan.targetPos = decodeLocation(robotPlan.nav_target.loc)
			if robotPlan.nav_target.heading then
				plan.targetDir = decodeDirection(robotPlan.nav_target.heading)
			end
		end

		if robotPlan.shot_target then
			plan.shootPos = decodeLocation(robotPlan.shot_target)
		end

		robotInfo[robotPlan.robot_id] = plan
	end
	return robotInfo
end

local function encodeLocation(loc)
	return { x = -loc.y * 1000, y = loc.x * 1000 }
end

local function encodeDirection(dir)
	return dir - math.pi/2
end

function mixedteam.encodeData(data)
	local teamPlan = {}
	for id, plan in pairs(data) do
		local robotPlan = {}
		robotPlan.robot_id = id
		robotPlan.role = plan.role
		if plan.targetPos or plan.targetDir then
			robotPlan.nav_target = {}
			if plan.targetPos then
				robotPlan.nav_target.loc = encodeLocation(plan.targetPos)
			end
			if plan.targetDir then
				robotPlan.nav_target.heading = encodeDirection(plan.targetDir)
			end
		end

		if plan.shootPos then
			robotPlan.shot_target = encodeLocation(plan.shootPos)
		end
		table.insert(teamPlan, robotPlan)
	end
	return { plans = teamPlan}
end

function mixedteam.sendInfo(data)
	local teamPlan = mixedteam.encodeData(data)
	sendMixedTeamInfo(teamPlan)
end

return mixedteam
