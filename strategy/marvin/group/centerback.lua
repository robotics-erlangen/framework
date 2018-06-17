local CenterBack = Class("Group.CenterBack")

local Robot = require "observer/robot"
local UtilDefense = require "util/defense"
local Rating = require "util/rating"
local Field = require "../base/field"
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

local function assignRobotsToPoints(robotList, pointList, resultAssignment, necessaryWay, isLeft, delta, radius)
	if isLeft then
		robotList = table.reverse(robotList)
		pointList = table.reverse(pointList)
	end
	if #robotList >= #pointList then
		--every point gets a robot, excess robots will be stored next to the necessaryWay. Consider merging problems.
		--to solve merging problems, assign from necessaryWay towards outside. If one target gets overlapped by doing so, the robot will be inserted like the target had never existed.
		local lastWay = necessaryWay
		local offset = #robotList - #pointList
		for i=1, offset do
			local way = lastWay + delta*(isLeft and -1 or 1)
			local point =  {
				["pos"] = Field.defenseIntersectionByWay(way, radius, true),
				["way"] = way,
			}
			resultAssignment[robotList[i]]=point
			lastWay = way
		end
		local substitutedPoints = {}
		for i,point in ipairs(pointList) do
			if isLeft then
				if point.way > lastWay - delta then
					local way = lastWay - delta
					local newPoint = {
						["pos"] = Field.defenseIntersectionByWay(way, radius, true),
						["way"] = way,
					}
					resultAssignment[robotList[i+offset]] = newPoint
					lastWay = way
					table.insert(substitutedPoints, point)
				else
					resultAssignment[robotList[i+offset]] = point
				end
			else
				if point.way < lastWay + delta then
					local way = lastWay + delta
					local newPoint =  {
						["pos"] = Field.defenseIntersectionByWay(way, radius, true),
						["way"] = way,
					}
					resultAssignment[robotList[i+offset]] = newPoint
					lastWay = way
					table.insert(substitutedPoints, point)
				else
					resultAssignment[robotList[i+offset]] = point
				end
			end
		end
		--check integrety
		if amun.isDebug then
			for _, point in ipairs(pointList) do
				if not table.contains(table.values(resultAssignment), point) and not table.contains(substitutedPoints, point) then
					error("point that is not covered: " .. tostring(point))
				end
			end
			for _, robot in ipairs(robotList) do
				if not table.contains(table.keys(resultAssignment), robot) then
					error("robot that is not covered: " .. tostring(robot))
				end
			end
		end
	else
		-- #pointList > #robotList
		-- greedely assign robots to points
		-- We can use UtilDefense.closestRobotToPos, as closesRobot uses only .pos, which is supplied by every point too
		for _, robot in ipairs(robotList) do
			local point = UtilDefense.getClosestRobot(pointList, robot.pos)
			resultAssignment[robot] = point
		end

		if amun.isDebug then
			for _, robot in ipairs(robotList) do
				if not table.contains(table.keys(resultAssignment), robot) then
					error("robot that is not covered: " .. tostring(robot))
				end
			end
		end
	end
end

--TODO: Target are are the moment defined as table that contains a Vector (pos).
--They should be {pos= Vector, dir=Vector, time = number}
--where pos is the position in the field that should be covered,
--dir is the direction that should be used for defenseIntersection
--time is the time (in s) until the coverage of this position is NECESSARY and therefore a change or a shifted position is not ok
--dir and time are optional, if they are ommitted, dir will always be G.FriendlyGoal-pos, and time will be math.huge
--if two targets are both going to be NECESSARY soon, the first NECESSARY target will be covered and other targets will not be considered NECESSARY

-- gets all CB applications as parameter (robot -> target)
local function calculateCenterBackPositions(centerBackApplications)
	-- important = if the centerbacks should take notice of that robot
	-- -> centerBacks move away to let that robot join the defense line
	-- -> must not happen to early
	-- necessary = if the target should be locked.
	-- -> locked targets may not be swapped
	-- -> locked targets may not be shifted
	-- -> there may be only one necessary target or zero.

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

	-- idealBot is the bot needed for the necessary target. It is nil, if no necessary target is needing attention now.
	local idealBot, necessaryWay
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


	--calculate the minimal time that was supplied (all other times are ignored)
	local minTime = math.huge
	for target,_ in pairs(robots) do
		if target.time and target.time < minTime then
			minTime = target.time
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
		local targetPos = target.pos
		local cBPos, way, sec
		if target == World.Ball then
			error("g/centerback interface changed")
		end
		-- centerBackPos will always return a way, as the target is limited to the field
		cBPos, way, sec = UtilDefense.centerBackPos(targetPos, target.dir)
		--check if the target is necessary but reachable
		local idealBotPrel = UtilDefense.getClosestRobot(robotSet,cBPos)
		local timeAroundDefenseArea = Robot.timeAroundDefenseAreaByWay(idealBotPrel, nil, cBPos, way, extraDistance, true)
		local targetTime = target.time or math.huge
		--only consider the next timestamp
		if targetTime > minTime then
			targetTime = math.huge
		end
		if adjustWay and sec then
			way = UtilDefense.mulCornerFactor(way, sec, extraDistance)
		end
		local n = #rlist
		if targetTime > timeAroundDefenseArea and timeAroundDefenseArea + 0.4 > targetTime then
			--mark one intersection with one bot to be necessary, and continue with reduced n for the rest.
			table.insert(intersections,{
				["waypos"] =  way,
				["wayrange"] = 2*robot_radius + distanceBetweenDefenders,
				["n"] = 1,
				["targets"] = {{["target"] = target, ["way"] = way, ["n"] = 1}},
				["necessary"] = true,
				["time"] = targetTime
			})
			n = n - 1
			idealBot = idealBotPrel
			necessaryWay = way
			--continue as usual
		end
		local occupiedWay = (#rlist) * (2 * robot_radius + distanceBetweenDefenders)

		way = math.bound(occupiedWay/2, way, waymaximum - occupiedWay/2)
		table.insert(intersections, {
			["waypos"] = way,
			["wayrange"] = occupiedWay,
			["n"] = n,
			["targets"] = {{["target"] = target, ["way"] = way, ["n"] = n}},
			["necessary"] = false,
			["time"] = targetTime
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
				if ix ~= jx then
					local jmin = j.waypos - j.wayrange/2
					local jmax = j.waypos + j.wayrange/2
					if imax > jmin and jmax > imin then
						if i.necessary or j.necessary then
							--locals for n(ecessary) and u(nnecessary)
							local n, ux, nmin, umin, nmax, umax
							if j.necessary then
								n = j
								ux = ix
								nmin, umin = jmin, imin
								nmax, umax = jmax, imax
							else
								n = i
								ux = jx
								nmin, umin = imin, jmin
								nmax, umax = imax, jmax
							end
							-- handle necessary object n. Two necessary are not possible
							-- first, move full robots to one side
							local disBetweenCenterOfCB = 2 * robot_radius + distanceBetweenDefenders
							local fullRobotMax = math.max(math.floor((umax - n.waypos) / disBetweenCenterOfCB),0)
							local fullRobotMin = math.max(math.floor((n.waypos - umin) / disBetweenCenterOfCB),0)
							nmax = nmax + disBetweenCenterOfCB * fullRobotMax
							nmin = nmin - disBetweenCenterOfCB * fullRobotMin
							n.waypos = (nmax + nmin) /2
							n.wayrange = (nmax - nmin)
							n.n = n.n + fullRobotMax + fullRobotMin
							--n.time shall not be modified
							if next(i.targets) == nil then
								i.targets = j.targets
							elseif next(j.targets) == nil then
								j.targets = i.targets
							end
							j.targets = table.append(i.targets, j.targets)
							table.remove(intersections, ux)
							merged = true
							break
						else
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
							j.time = math.min(i.time, j.time)
							table.remove(intersections, ix)
							break
						end
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
	local EPSILON = 0.005
	local necessaryDefensePoint = nil

	-- calculate final positions for important robots
	local delta = 2 * robot_radius + distanceBetweenDefenders
	local defensePoints = {}
	for _,i in ipairs(intersections) do
		local way = i.waypos - i.wayrange/2 + delta/2
		for _,t in ipairs(i.targets) do
			for _ = 1,t.n do
				local realWay = way
				if adjustWay then
					realWay = UtilDefense.divCornerFactor(way, extraDistance)
				end
				local final_pos = Field.defenseIntersectionByWay(realWay, extraDistance, true) --defenseIntersectionByWay can handle outOfBounds correctly (extended DefArea)
				vis.addCircle("g/centerback: Positions", final_pos, 0.1, vis.colors.skyBlue)
				vis.addPath("g/centerback: Positions", {final_pos, t.target.pos},  vis.colors.skyBlue)
				vis.addCircle("g/centerback: Target", t.target.pos, 0.1, vis.colors.red)
				local point =  {
					["pos"] = final_pos,
					["target"] = t.target,
					["way"] = way,
					["time"] = (i.n == 1) and i.time or math.huge
				}
				if necessaryWay and math.abs(way-necessaryWay) < EPSILON then
					assert (not necessaryDefensePoint, "two necessary Points are a problem")
					necessaryDefensePoint = point
				end
				table.insert(defensePoints, point)
				way = way + delta
			end
		end
	end

	-- sort robots
	local sortedRobots = {}
	for _,r in ipairs(robotSet) do
		table.insert(sortedRobots, r)
	end
	table.sort(sortedRobots, lessthan_robots)

	-- store result (robot -> (pos, target, way))
	centerBackPositions = {}
	if not idealBot then
		assert(#defensePoints == #sortedRobots)
		for i = 1,#sortedRobots do
			centerBackPositions[sortedRobots[i]] = defensePoints[i]
		end
	else
		-- first: Assign the ideal bot to the necessary defense Point
		centerBackPositions[idealBot] = necessaryDefensePoint
		--second: partition the world in pre and post idealBot / defensePoint
		local firstRobots, secondRobots = table.splitByValue(sortedRobots, idealBot)
		local firstPoints, secondPoints = table.splitByValue(defensePoints, necessaryDefensePoint)
		assignRobotsToPoints(firstRobots, firstPoints, centerBackPositions, necessaryDefensePoint.way, true, delta, extraDistance)
		assignRobotsToPoints(secondRobots, secondPoints, centerBackPositions, necessaryDefensePoint.way, false, delta, extraDistance)
	end

	-- calculate final positions for unimportant robots
	privateCenterBackPositions = {}
	for robot, target in pairs(unimportantApplications) do
		-- if the target is the ball, predict it
		local targetPos = target.pos
		local _, target_way, target_sec, robot_way, robot_sec = nil
		if target == World.Ball then
			error("g/centerback interface changed")
		end
		_, target_way, target_sec = UtilDefense.centerBackPos(targetPos)
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
