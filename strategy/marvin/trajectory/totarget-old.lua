local OldController = (require "../base/class").new("Trajectory.OldController", (require "../base/trajectory").Base)
local Coordinates = require "../base/coordinates"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local World = require "../base/world"

function OldController:reset()
	self.parameters = {}
	if (self._robot.generation == 1) then --generation 2009
		self.parameters.factorProp = 3
		self.parameters.k_omega = 2
		self.parameters.limitRot = 4 * math.pi
	elseif (self._robot.generation == 2) then --generation 2011
		self.parameters.factorProp = 5
		self.parameters.k_omega = 3
		self.parameters.limitRot = 2 * math.pi
	else
		self.parameters = nil
	end
end

function OldController:_init()
	self.intCtrl = Vector.create(0, 0)
end

function OldController:update(targetPos, targetDir, maxSpeed, endSpeed)
	self:reset()
	if not self.parameters then
		return {}, Coordinates.toLocal(targetPos), 0
	end
	maxSpeed = maxSpeed or self._robot.maxSpeed
	endSpeed = endSpeed or Vector.create(0, 0)
	
	targetPos = Coordinates.toGlobal(targetPos)
	targetDir = Coordinates.toGlobal(targetDir)
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	local robotSpeed = Coordinates.toGlobal(self._robot.speed)
	local robotDir = Coordinates.toGlobal(self._robot.dir)
	
	self._robot.path:setProbabilities(0.1, 0.9)
	local waypoints = self._robot.path:get(robotPos.x, robotPos.y, targetPos.x, targetPos.y)

	table.remove(waypoints, 1) -- remove robot position
	if #waypoints == 0 and endSpeed:length() == 0 then -- no waypoints left
		if self._robot.pos:distanceTo(targetPos) > 0.01 then
			vis.addCircleRaw("waypoints", robotPos, 0.05, vis.colors.pinkHalf)
		end
		return {}, Coordinates.toLocal(targetPos), 0
	end
	
	local prev = robotPos
	local dist = 0
	for i=1,#waypoints do
		local cur = Vector.create(waypoints[i].p_x, waypoints[i].p_y)
		vis.addPathRaw("waypoints", {prev, cur}, vis.colors.yellow)
		dist = dist + cur:distanceTo(prev)
		prev = cur
	end
	
	-- distance without end speed hack
	local waypointDist = dist

	-- add additional waypoint to try reaching the end speed
	if endSpeed:length() > 0 then
		local extraDist = endSpeed:length() / self.parameters.factorProp
		table.insert(waypoints, prev + endSpeed:copy():setLength(extraDist))
		dist = dist + extraDist
	end

	-- only brake down to endSpeed
	local brakeDist = maxSpeed / self.parameters.factorProp
	brakeDist = math.bound(0, brakeDist, dist)
	-- brake distance without end speed hack
	local waypointBrakeDist = math.min(brakeDist, waypointDist)
	
	local v_robot = self.parameters.factorProp * brakeDist
	local nextPoint = Vector.create(waypoints[1].p_x, waypoints[1].p_y)
	
	local speed = (nextPoint - robotPos):setLength(v_robot)
	
	-- bound speed to self._robot.maxSpeed without changing the direction
	if speed:length() > self._robot.maxSpeed then
		speed:setLength(self._robot.maxSpeed)
	end

	local time = (waypointDist - waypointBrakeDist) / self._robot.maxSpeed + (1 / self.parameters.factorProp) * (math.log(waypointBrakeDist) + 4.60517) --4.6 is log(100)
	if time < 0 then
		time = 0
	end
	
	
	local limitRot = self.parameters.limitRot
	-- Reglerabweichung berechnen
	local error_phi = geom.getAngleDiff(robotDir, targetDir)
	-- limit rot. speed
	local angularSpeed = math.bound(-limitRot, error_phi * self.parameters.k_omega, limitRot)
	
	local spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = speed.x, a2 = 0, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speed.y, a2 = 0, a3 = 0 },
		phi = { a0 = robotDir, a1 = angularSpeed, a2 = 0, a3 = 0}
	} }

	return {spline = spline}, Coordinates.toLocal(targetPos), time
end

function OldController:canHandle(targetPos, targetDir, maxSpeed, endSpeed)
	return true
end

return OldController
--return require "trajectory/simplebangbang"
