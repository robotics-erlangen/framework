local CenterBack = Class("Group.CenterBack")

local Field = require "../base/field"
local UtilDefense = require "util/defense"
local Rating = require "util/rating"
local vis = require "../base/vis"
local World = require "../base/world"

local G = World.Geometry
local adjustWay = World.RULEVERSION == "2018"

local lessthan_intersections = function(i1, i2)
	return i1.waypos < i2.waypos
end
local lessthan_targets = function(t1, t2)
	return t1.way < t2.way
end

local lessthan_robots = function(r1, r2)
	local a1 = (r1.pos - World.Geometry.FriendlyGoal):angle()
	local a2 = (r2.pos - World.Geometry.FriendlyGoal):angle()
	if a1 < -math.pi/2 then a1 = a1 + 2 * math.pi end
	if a2 < -math.pi/2 then a2 = a2 + 2 * math.pi end
	return a1 > a2
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
	local distanceToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea()

	-- parameters
	local ballDistanceToDefenseArea = Field.distanceToFriendlyDefenseArea(World.Ball.pos, 0)
	local extraDistanceBetweenDefenders = Rating.valueToRating(ballDistanceToDefenseArea, 2, 4) * 0.06
	local minDistanceBetweenDefenders = 0.01
	local distanceBetweenDefenders = minDistanceBetweenDefenders + extraDistanceBetweenDefenders
	if World.RefereeState == "Stop" then
		distanceBetweenDefenders = math.max(distanceBetweenDefenders, 0.03)
	end
	local getImportant = 2 * robot_radius + 0.02 + distanceToDefenseArea

	if Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius + 2 * robot_radius + distanceToDefenseArea + 0.4) then
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


	-- -- calculate middle position and way footprint
	local waymaximum
	if adjustWay then
		waymaximum = math.pi * (distanceToDefenseArea + robot_radius) * UtilDefense.cornerFactor + G.DefenseWidth + 2* G.DefenseHeight
	else
		waymaximum = math.pi * (World.Geometry.DefenseRadius + distanceToDefenseArea + robot_radius) +
				World.Geometry.DefenseStretch
	end
	local extraDistance = distanceToDefenseArea + robot_radius
	local intersections = {}
	for target, rlist in pairs(robots) do
		-- if the target is the ball, predict it
		local targetPos = target.pos
		local _, way, sec
		if target == World.Ball then
			targetPos, way, sec = UtilDefense.calculateBallPosition()
			assert(way, "calling centerBackPos/IntersectRayDefenseArea twice is bad")
		end
		if not way then
			-- centerBackPos will always return a way, as the target is limited to the field
			_, way, sec = UtilDefense.centerBackPos(targetPos)
		end
		if adjustWay and sec then
			way = UtilDefense.mulCornerFactor(way, sec, extraDistance)
		end
		local occupiedWay = (#rlist) * (2 * robot_radius + distanceBetweenDefenders)

		--shift position slightly to cover more of the opposite goal corner of the keeper position
		if target == World.Ball and World.FriendlyKeeper then
			way = way - (robot_radius / 2) * (Rating.valueToRating(World.FriendlyKeeper.pos.x, -0.2, 0.2) * 2 - 1)
		end

		way = math.bound(occupiedWay/2, way, waymaximum - occupiedWay/2)
		table.insert(intersections, {
			["waypos"] = way,
			["wayrange"] = occupiedWay,
			["n"] = #rlist,
			["targets"] = {{["target"] = target, ["way"] = way, ["n"] = #rlist}}
		})
	end


	-- merge overlapping way intervals (got-)merged
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
						if next(i.targets) == nil then
							i.targets = j.targets
						elseif next(j.targets) == nil then
							j.targets = i.targets
						end
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
				local realWay = way
				if adjustWay then
					realWay = UtilDefense.divCornerFactor(way, extraDistance)
				end
				local final_pos = Field.defenseIntersectionByWay(realWay, extraDistance, true)
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
		local _, target_way, target_sec, robot_way, robot_sec = nil
		if target == World.Ball then
			targetPos, target_way, target_sec = UtilDefense.calculateBallPosition()
			assert(target_way, "calling centerBackPos / IntersectRayDefenseArea twice is bad")
		end
		if not target_way then
			_, target_way, target_sec = UtilDefense.centerBackPos(targetPos)
		end
		if adjustWay and target_sec then
			target_way = UtilDefense.mulCornerFactor(target_way, target_sec, extraDistance)
		end
		-- stay on one end of a group of CenterBacks
		_, robot_way, robot_sec = UtilDefense.centerBackPos(robot.pos)
		if adjustWay and robot_sec then
			robot_way = UtilDefense.mulCornerFactor(robot_way, robot_sec, extraDistance)
		end
		for _,i in ipairs(intersections) do
			if target_way - robot_radius < i.waypos + i.wayrange/2
					and target_way + robot_radius > i.waypos - i.wayrange/2 then
				target_way = math.bound(i.waypos - i.wayrange/2 - robot_radius,
						robot_way, i.waypos + i.wayrange/2 + robot_radius)
			end
		end
		if adjustWay and robot_sec then
			target_way = UtilDefense.divCornerFactor(target_way, extraDistance)
		end
		local pos = Field.defenseIntersectionByWay(target_way, extraDistance, true)
		vis.addCircle("g/centerback: Positions", pos, 0.1, vis.colors.greenHalf)
		privateCenterBackPositions[robot] = {["pos"] = pos, ["target"] = target, ["way"] = target_way}
	end
end

function CenterBack:init()
	self.name = "centerback"
end

function CenterBack:run(sender, _, messages)
	calculateCenterBackPositions(messages)

	for robot, _ in pairs(messages) do
		local pos_target = centerBackPositions[robot]
		pos_target = pos_target or privateCenterBackPositions[robot]
		sender.centerBackPosTarget(robot, pos_target)
	end
end

return CenterBack
