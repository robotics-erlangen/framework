local ForceShoot = require "task/ability/forceshoot"
local CenterBack = Class("Task.CenterBack", require "task/base", ForceShoot)

local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local Goal = require "observer/goal"
local Robot = require "observer/robot"
local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"


local G = World.Geometry

local lt = function(i1, i2)
	return i1.waypos < i2.waypos
end
local lt3 = function(t1, t2)
	return t1.way < t2.way
end

local lastOrder = {}
local robotAngleHysteresis = 0.0
local lt2 = function(r1, r2)
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

function CenterBack.distanceToDefenseArea()
	-- 0.18 (robot diameter) + 0.08 (default distance) + 0.50 (stop radius)
	if Referee.isStopState() then
		local dist = Field.distanceToFriendlyDefenseArea(World.Ball.pos, World.Ball.radius)
		return math.bound(0.01, dist - 0.68, 0.08)
	end
	return 0.08
end

CenterBack.defaultPos = Vector(0, -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius + 0.09 + 0.02)

local privateCenterBackPositions = {}
local centerBackPositions = {}
local lastRunTime = 0

local function outdatedCenterBackPositions()
	return World.Time > lastRunTime
end

-- gets all CB applications as parameter (robot -> target)
local function calculateCenterBackPositions(centerBackApplications)
	-- important = if the centerbacks should take notice of that robot
	-- -> centerBacks move away to let that robot join the defense line
	-- -> must not happen to early


	lastRunTime = World.Time

	-- constants
	local robot_radius = World.FriendlyRobots[1].radius
	local distanceToDefenseArea = CenterBack.distanceToDefenseArea()

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
		local pos, way
		if target == World.Ball then
			local predictedSpeed, isShot
			targetPos, predictedSpeed, isShot = Goal.predictShot()

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
			pos, way = Field.intersectRayDefenseArea(G.FriendlyGoal, targetPos - G.FriendlyGoal,
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
	table.sort(intersections, lt)
	for _,i in ipairs(intersections) do
		table.sort(i.targets, lt3)
	end

	-- calculate final positions for important robots
	local defensePoints = {}
	for _,i in ipairs(intersections) do
		local delta = 2 * robot_radius + distanceBetweenDefenders
		local way = i.waypos - i.wayrange/2 + delta/2
		for _,t in ipairs(i.targets) do
			for j = 1,t.n do
				local final_pos = Field.defenseIntersectionByWay(way, robot_radius + distanceToDefenseArea, false)
				vis.addCircle("t/centerback: Positions", final_pos, 0.1, vis.colors.skyBlue)
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
	table.sort(sortedRobots, lt2)
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
		vis.addCircle("t/centerback: Positions", pos, 0.1, vis.colors.greenHalf)
		privateCenterBackPositions[robot] = {["pos"] = pos, ["target"] = target, ["way"] = target_way}
	end
end

function CenterBack:_init(centerbackTarget)
	self._preliminaryCenterbackTarget = centerbackTarget or World.Ball
	self._lookingToGoal = true
end


function CenterBack:run()
	self._send.preliminaryCenterbackTarget("all", self._preliminaryCenterbackTarget)

	if outdatedCenterBackPositions() then
		calculateCenterBackPositions(self._inbox.preliminaryCenterbackTarget("broadcast"))
	end
	local pos_target = centerBackPositions[self._robot]
	pos_target = pos_target or privateCenterBackPositions[self._robot]

	local destinationPos = pos_target and pos_target.pos or CenterBack.defaultPos
	local destinationTarget = pos_target and pos_target.target or self._preliminaryCenterbackTarget

	local toBallAngle = (World.Ball.pos - self._robot.pos):angle()
	local toGoalAngle = (World.Geometry.OpponentGoal - self._robot.pos):angle()
	local toCornerLeftAngle = (Vector(-World.Geometry.FieldWidthHalf,
			World.Geometry.FieldHeightHalf) - self._robot.pos):angle()
	local toCornerRightAngle = (Vector(World.Geometry.FieldWidthHalf,
			World.Geometry.FieldHeightHalf) - self._robot.pos):angle()
	local fromGoalAngle = (self._robot.pos - World.Geometry.FriendlyGoal):angle()

	local hystAngle = 5 * math.pi/180
	local dir = toBallAngle
	if (self._lookingToGoal and toBallAngle < toCornerLeftAngle + hystAngle and
			toBallAngle > toCornerRightAngle + hystAngle) or
			(toBallAngle < toCornerLeftAngle - hystAngle and
			toBallAngle > toCornerRightAngle - hystAngle) then
		dir = toGoalAngle
		self._lookingToGoal = true
	else
		self._lookingToGoal = false
	end

	local maxAngleTilt = 40 * math.pi / 180
	dir = math.bound(fromGoalAngle - maxAngleTilt, dir, fromGoalAngle + maxAngleTilt)

	debug.set("target", destinationTarget)

	if not Robot.hadBall(self._robot, 0) then
		self._forceShootTimer = nil
	end
	local chipActivationAngle = math.pi / 6
	local isGame = World.RefereeState == "Game" or World.RefereeState == "GameForce"
	if isGame and dir > chipActivationAngle and dir < math.pi - chipActivationAngle and
			Vector.fromAngle(dir):absoluteAngleDiff(destinationPos - G.FriendlyGoal) < math.pi
			and World.Ball.pos:distanceTo(self._robot.pos) < 1
			and self._robot.pos:distanceTo(destinationPos) < 1 then
		debug.set("chip", true)
		self:_doForceShoot()
		self._robot:chip(2)
	end

	local ignoreOpponents = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 4 * self._robot.radius + self.distanceToDefenseArea() + 0.05

	local ignoreFriends = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
		< 2 * self._robot.radius + self.distanceToDefenseArea() + 0.05

	-- Quick fix to not interfere with goal shots
	local shooter, shootDest = next(self._inbox.shootDestination())
	if shootDest then
		self._robot.path:addLine(World.Ball.pos.x, World.Ball.pos.y, shootDest.x, shootDest.y, self._robot.radius)
	end

	--move robot
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)
	PathHelper.addRobotObstacles(self._robot.path, self._robot, ignoreFriends, ignoreOpponents)
	self._robot.trajectory:update(ToTarget, destinationPos, dir)
	self._send.moveDest("all", destinationPos)
	self._send.centerbackTarget("all", destinationTarget)
end

return CenterBack
