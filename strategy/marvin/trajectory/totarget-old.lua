local OldController = Class("Trajectory.OldController", (require "../base/trajectory").Base)

local Coordinates = require "../base/coordinates"
local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"


function OldController:reset()
	self.parameters = {}
	if self._robot.generation == 2 then --generation 2012
		self.parameters.factorProp = 5
		self.parameters.k_omega = 3
		self.parameters.limitRot = 2 * math.pi
	elseif self._robot.generation == 3 then --generation 2014
		self.parameters.factorProp = 5
		self.parameters.k_omega = 3
		self.parameters.limitRot = 2 * math.pi
	else
		self.parameters = nil
	end
end

function OldController:_init()
	self.intCtrl = Vector(0, 0)
end

function OldController:update(targetPos, targetDir, maxSpeed, endSpeed)
	self:reset()
	if not self.parameters then
		return {}, Coordinates.toLocal(targetPos), 0
	end
	maxSpeed = maxSpeed or self._robot.maxSpeed
	endSpeed = endSpeed or Vector(0, 0)

	targetPos = Coordinates.toGlobal(targetPos)
	targetDir = Coordinates.toGlobal(targetDir)
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	local robotSpeed = Coordinates.toGlobal(self._robot.speed)
	local robotDir = Coordinates.toGlobal(self._robot.dir)

	self._robot.path:setProbabilities(0.1, 0.4)
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
		local cur = Vector(waypoints[i].p_x, waypoints[i].p_y)
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
	local nextPoint = Vector(waypoints[1].p_x, waypoints[1].p_y)

	local speed = (nextPoint - robotPos):setLength(v_robot)

	-- calculate time required for exponential part
	local exponentialError = 0.05 -- relative
	local k = self.parameters.factorProp -- 1 / exponentialTime
	local exponentialTime = 1 / k
	local timeFactor = -math.log(exponentialError)

	-- in exponential part
	if waypointDist == waypointBrakeDist then
		local expStartSpeed = maxSpeed
		 -- integrate v(t) from 0 to +inf + distance traveled with endSpeed
		local expDistance = expStartSpeed*exponentialTime
		local endSpeedLen = endSpeed:length()
		-- assume target is reached if exponential part traveled a distance of (1-exponentialError)*expDistance
		-- solve integrate(expStartSpeed*%e^(-k*t)+endSpeed,t,0,t)=expDistance+endSpeed*fac-d for t
		-- brakeDist decreases when getting closer to the target
		local time = 2*exponentialTime -- initial guess
		local expTime = timeFactor*exponentialTime -- time for the full exponential part
		for i = 1, 10 do
			local e = math.exp(-k*time)
			-- only consider endSpeedLen for a distance of expTime * endSpeedLen
			local err = math.max(0, time-expTime)*endSpeedLen-e*expDistance+waypointBrakeDist
			local diff
			if time < expTime then
				diff = expStartSpeed*e+endSpeedLen
			else
				diff = expStartSpeed*e
			end
			time = math.bound(0, time - err/diff, 10*exponentialTime)
		end
		timeFactor = math.max(0, timeFactor - time / exponentialTime)
	end
	local etime = timeFactor*exponentialTime

	-- add time for part with maxSpeed
	local time = math.max(0, (waypointDist - waypointBrakeDist) / maxSpeed + etime)


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
