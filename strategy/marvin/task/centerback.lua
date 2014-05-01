local CenterBack = (require "../base/class").new("Task.CenterBack", require "task/base")

local World = require "../base/world"
local Messaging = require "control/messaging"
local Processor = require "../base/processor"
local ToTarget = require "trajectory/totarget"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local Rating = require "util/rating"
local Field = require "util/field"
local Goal = require "observer/goal"
local G = World.Geometry

CenterBack.priority = 5


local lt = function(i1, i2) 
	return i1.waypos < i2.waypos
end
local lastOrder = {}
local robotAngleHysteresis = 0.0
local lt2 = function(r1, r2)
	local a1 = (r1.pos - World.Geometry.FriendlyGoal):angle()
	local a2 = (r2.pos - World.Geometry.FriendlyGoal):angle()
	if a1 <= a2 - robotAngleHysteresis then
		return false
	elseif a2 < a1 - robotAngleHysteresis then
		return true
	else
		local ix1 = r1.id + 1000
		local ix2 = r2.id + 1000
		for ix,r in pairs(lastOrder) do
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

local centerBackPositions = {}
local lastRunTime = 0
local function calculateCenterBackPositions()
	-- cache it
	if lastRunTime == World.Time then return end
	lastRunTime = World.Time

	-- positioning parameters
	-- TODO: change them dynamically dependent on how dangerous the current situation is
	local distanceToDefenseArea = 0.03
	local distanceBetweenDefenders = 0.01




	local robot_radius = World.FriendlyRobots[1].radius or 0.09

	local centerBackApplications = Messaging.get("preliminaryCenterbackTarget")

	-- transform application data structure from (robot, target) to (target, {robot})
	local robots = {}
	for robot, target in pairs(centerBackApplications) do
		if robots[target] == nil then
			robots[target] = {}
		end
		table.insert(robots[target], robot)
	end



	-- calculate middle position and way footprint
	local waymaximum = math.pi * (World.Geometry.DefenseRadius + distanceToDefenseArea + robot_radius) +
		World.Geometry.DefenseStretch
	local intersections = {}
	for target, rlist in pairs(robots) do
		local targetPos = Field.limitToField(target.pos)
		local pos, way = Field.intersectLineDefenseArea(targetPos, World.Geometry.FriendlyGoal - targetPos,
				distanceToDefenseArea + robot_radius, false)
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


	-- merge those who would collide
	local merged = true
	while merged do
		merged = false
		for ix,i in pairs(intersections) do
			local imin = i.waypos - i.wayrange/2
			local imax = i.waypos + i.wayrange/2
			for jx,j in pairs(intersections) do			
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

	for _,i in pairs(intersections) do
	--	log(tostring(i.targets[1].target) .. "  " .. i.targets[1].way)
	end

	-- sort intersection interval table
	table.sort(intersections, lt)

	-- calculate final positions
	local defensePoints = {}
	for _,i in pairs(intersections) do
		local delta = 2 * robot_radius + distanceBetweenDefenders
		local way = i.waypos - i.wayrange/2 + delta/2
		for _,t in pairs(i.targets) do
			for j = 1,t.n do
				vis.addCircle("CenterBack/Positions", 
					Field.defenseIntersectionByWay(robot_radius + distanceToDefenseArea, way, false),
					0.1, vis.colors.skyBlue)
				table.insert(defensePoints, {
					["pos"] = Field.defenseIntersectionByWay(robot_radius + distanceToDefenseArea, way, false),
					["target"] = t.target
				})
				way = way + delta
			end
		end 
	end

	-- sort robots
	local sortedRobots = {}
	for r in pairs(centerBackApplications) do
		table.insert(sortedRobots, r)
	end
	assert(#defensePoints == #sortedRobots)
	table.sort(sortedRobots, lt2)
	lastOrder = sortedRobots

	-- store result (robot -> (pos, target))
	centerBackPositions = {}
	for i = 1,#sortedRobots do
		centerBackPositions[sortedRobots[i]] = defensePoints[i]
	end
end

function CenterBack:_init(centerbackTarget)
	self._preliminaryCenterbackTarget = centerbackTarget or World.Ball
end


function CenterBack:run()
	self._send("all").preliminaryCenterbackTarget(self._preliminaryCenterbackTarget)

	calculateCenterBackPositions()
	local pos_target = centerBackPositions[self._robot]

	local default_pos = Vector.create(0, -World.Geometry.FieldHeightHalf + World.Geometry.DefenseRadius
		+ self._robot.radius + 0.02)
	local destinationPos = pos_target and pos_target.pos or default_pos
	local destinationTarget = pos_target and pos_target.target or
			self._preliminaryCenterbackTarget
	local dir = (World.Ball.pos - self._robot.pos):angle()
	
	debug.set("target", destinationTarget)

	local ignoreOpponents
		= Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius) < 2*self._robot.radius
	
	local ignoreFriends
		= destinationPos:distanceTo(self._robot.pos) < 2*self._robot.radius

	--move robot
	self._robot.path:setDefaultObstacles(self._robot)
	self._robot.path:addRobotObstacles(self._robot, ignoreFriends, ignoreOpponents)
	self._robot.trajectory:update(ToTarget, destinationPos, dir)
	self._send("all").moveDest(destinationPos)
	self._send("all").centerbackTarget(destinationTarget) -- TODO marked opponent robot
end

return CenterBack