local CenterBack = {}
CenterBack.name = "centerback"

local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Goal = require "observer/goal"
local CenterBackTask = require "task/centerback"

local G = World.Geometry


local lessthan_intersections = function(i1, i2)
	return i1.waypos < i2.waypos
end
local lessthan_targets = function(t1, t2)
	return t1.way < t2.way
end

local lastOrder = {}
local robotAngleHysteresis = 0.0
local lessthan_robots = function(r1, r2)
	local a1 = (r1.pos - World.Geometry.FriendlyGoal):angle()
	local a2 = (r2.pos - World.Geometry.FriendlyGoal):angle()
	if a1 < -math.pi/2 then a1 = a1 + 2 * math.pi end
	if a2 < -math.pi/2 then a2 = a2 + 2 * math.pi end

	if a1 <= a2 - robotAngleHysteresis then
		return false
	elseif a2 < a1 - robotAngleHysteresis then
		return true
	else
		local ix1 = r1.id + 1000
		local ix2 = r2.id + 1000
		for ix,r in ipairs(lastOrder) do
			if r == r1 then
				ix1 = ix
			elseif r == r2 then
				ix2 = ix
			end
		end
		log("blooooh")
		return ix1 < ix2
	end
end

local privateCenterBackPositions = {}
local centerBackPositions = {}

-- gets all CB applications as parameter (robot -> target)
local function calculateCenterBackPositions(centerBackApplications)
	-- important = if the centerbacks should take notice of that robot
	-- -> centerBacks move away to let that robot join the defense line
	-- -> must not happen to early

	-- constants
	local robot_radius = 0.09
	local distanceToDefenseArea = CenterBackTask.distanceToDefenseArea()

	-- parameters
	local distanceBetweenDefenders = 0.01
	local getImportant = 2 * robot_radius + 0.03

	if Field.distanceToFriendlyDefenseArea(World.Ball.pos, World.Ball.radius)
		< 2 * robot_radius + distanceToDefenseArea + 0.4 then
		distanceBetweenDefenders = 0
	end

	-- collect all important targets and assign them the list of robots
	-- only consider those as important that are within a certain range to their destination
	local robots = {} -- all targets with their important robots (target -> [robot])
	local robotSet = {} -- all important robots ([robot])
	local unimportantApplications = {} -- (robot -> target)
	for robot, target in pairs(centerBackApplications) do
		local distToDefenseArea = Field.distanceToFriendlyDefenseArea(robot.pos, robot.radius)
		local important = distToDefenseArea < getImportant

		-- if important: insert the robot in the data structures
		--               for calculating the positions for important robots
		-- otherwise: calculate their position after the important ones
		if important then
			if robots[target] == nil then
				robots[target] = {}
			end
			table.insert(robots[target], robot)
			table.insert(robotSet, robot)
		else
			unimportantApplications[robot] = target
		end
	end


	-- calculate middle position and way footprint
	local waymaximum = math.pi * (World.Geometry.DefenseRadius + distanceToDefenseArea + robot_radius) +
		World.Geometry.DefenseStretch
	local intersections = {}
	for target, rlist in pairs(robots) do
		-- if the target is the ball, predict it
		local targetPos = target.pos
		local _, way
		if target == World.Ball then
			local _, isShot
			targetPos, _, isShot = Goal.predictShot()

			if isShot then
				local goalLineIntersection = geom.intersectLineLine(World.Ball.pos,
					World.Ball.speed, G.FriendlyGoal, Vector(1, 0))
				if goalLineIntersection and World.Ball.speed.y < 0 and
						math.abs(goalLineIntersection.x) < G.GoalWidth / 2 + 0.15 then
					targetPos, way = Field.intersectRayDefenseArea(World.Ball.pos, World.Ball.speed,
						distanceToDefenseArea + robot_radius, false)
				end
			end
		end
		if not way then
			targetPos = Field.limitToField(targetPos, -0.01)
			_, way = Field.intersectRayDefenseArea(G.FriendlyGoal, targetPos - G.FriendlyGoal,
				distanceToDefenseArea + robot_radius, false)
		end
		local occupiedWay = (#rlist) * (2 * robot_radius + distanceBetweenDefenders)
		way = math.max(way, occupiedWay/2)
		way = math.min(way, waymaximum - occupiedWay/2)
		table.insert(intersections, {
			["waypos"] = way,
			["wayrange"] = occupiedWay,
			["n"] = #rlist,
			["targets"] = {{["target"] = target, ["way"] = way, ["n"] = #rlist}}
		})
	end


	-- merge overlapping way intervals
	local merged = true
	while merged do
		merged = false
		for ix,i in ipairs(intersections) do
			local imin = i.waypos - i.wayrange/2
			local imax = i.waypos + i.wayrange/2
			for jx,j in ipairs(intersections) do
				local jmin = j.waypos - j.wayrange/2
				local jmax = j.waypos + j.wayrange/2
				if ix ~= jx then
					if imax > jmin and jmax > imin then
						merged = true
						local totalWay = i.wayrange + j.wayrange
						local totalN = i.n + j.n
						local totalPos = (i.waypos * i.n + j.waypos * j.n) / totalN
						totalPos = math.max(totalPos, totalWay/2)
						totalPos = math.min(totalPos, waymaximum-totalWay/2)
						j.waypos = totalPos
						j.wayrange = totalWay
						j.n = totalN
						j.targets = table.append(i.targets, j.targets)
						table.remove(intersections, ix)
						break
					end
				end
			end
			if merged then
				break
			end
		end
	end


	-- sort intersection interval table
	table.sort(intersections, lessthan_intersections)
	for _,i in ipairs(intersections) do
		table.sort(i.targets, lessthan_targets)
	end

	-- calculate final positions for important robots
	local defensePoints = {}
	for _,i in ipairs(intersections) do
		local delta = 2 * robot_radius + distanceBetweenDefenders
		local way = i.waypos - i.wayrange/2 + delta/2
		for _,t in ipairs(i.targets) do
			for _ = 1,t.n do
				local final_pos = Field.defenseIntersectionByWay(way, robot_radius + distanceToDefenseArea, false)
				vis.addCircle("g/centerback: Positions", final_pos, 0.1, vis.colors.skyBlue)
				table.insert(defensePoints, {
					["pos"] = final_pos,
					["target"] = t.target,
					["way"] = way
				})

				way = way + delta
			end
		end
	end

	-- sort robots
	local sortedRobots = {}
	for _,r in ipairs(robotSet) do
		table.insert(sortedRobots, r)
	end
	assert(#defensePoints == #sortedRobots)
	table.sort(sortedRobots, lessthan_robots)
	lastOrder = sortedRobots

	-- store result (robot -> (pos, target, way))
	centerBackPositions = {}
	for i = 1,#sortedRobots do
		centerBackPositions[sortedRobots[i]] = defensePoints[i]
	end

	-- calculate final positions for unimportant robots
	privateCenterBackPositions = {}
	for robot, target in pairs(unimportantApplications) do
		-- if the target is the ball, predict it
		local targetPos = target.pos
		if target == World.Ball then
			targetPos = Goal.predictShot()
		end
		targetPos = Field.limitToField(targetPos, -0.01)
		local _, target_way = Field.intersectRayDefenseArea(G.FriendlyGoal, targetPos - G.FriendlyGoal,
				distanceToDefenseArea + robot_radius, false)
		local _, robot_way = Field.intersectRayDefenseArea(G.FriendlyGoal, robot.pos - G.FriendlyGoal,
				distanceToDefenseArea + robot_radius, false)
		for _,i in ipairs(intersections) do
			if target_way - robot_radius < i.waypos + i.wayrange/2
					and target_way + robot_radius > i.waypos - i.wayrange/2 then
				target_way = math.bound(i.waypos - i.wayrange/2 - robot_radius,
						robot_way, i.waypos + i.wayrange/2 + robot_radius)
			end
		end

		local pos = Field.defenseIntersectionByWay(target_way, robot_radius + distanceToDefenseArea, false)
		vis.addCircle("g/centerback: Positions", pos, 0.1, vis.colors.greenHalf)
		privateCenterBackPositions[robot] = {["pos"] = pos, ["target"] = target, ["way"] = target_way}
	end
end

function CenterBack.run(trainerInstance, nRobots, messages)
	calculateCenterBackPositions(messages)

	for robot, _ in pairs(messages) do
		local pos_target = centerBackPositions[robot]
		pos_target = pos_target or privateCenterBackPositions[robot]
		trainerInstance._send.centerBackPosTarget(robot, pos_target)
	end
end

return CenterBack