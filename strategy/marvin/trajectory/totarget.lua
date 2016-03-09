local OldController = Class("Trajectory.ToTarget", (require "../base/trajectory").Base)

local Coordinates = require "../base/coordinates"
local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"


function OldController:reset()
	self.parameters = {}
	if self._robot.generation == 2 then --generation 2012
		self.parameters.factorProp = 5
		self.parameters.k_omega = 10
		self.parameters.limitRot = 2 * math.pi
	elseif self._robot.generation == 3 then --generation 2014
		self.parameters.factorProp = 5
		self.parameters.k_omega = 10
		self.parameters.limitRot = 2 * math.pi
	else
		self.parameters = nil
	end
end

function OldController:_init()
	self.intCtrl = Vector(0, 0)
	self.parameters = nil
	self.v_last = nil
	self._counter = nil
end

-- FIXME update endSpeed meaning
function OldController:update(targetPos, targetDir, maxSpeed, endSpeed)
	self:reset()
	if not self.parameters then
		return {}, Coordinates.toLocal(targetPos), 0
	end
	maxSpeed = maxSpeed or self._robot.maxSpeed
	endSpeed = endSpeed or 0

	targetPos = Coordinates.toGlobal(targetPos)
	targetDir = Coordinates.toGlobal(targetDir)
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	local robotSpeed = Coordinates.toGlobal(self._robot.speed)
	local robotDir = Coordinates.toGlobal(self._robot.dir)

	self._robot.path:setProbabilities(0.1, 0.4)
	local waypoints = self._robot.path:get(robotPos.x, robotPos.y, targetPos.x, targetPos.y)

	table.remove(waypoints, 1) -- remove robot position
	if #waypoints == 0 then -- no waypoints left
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

	local brakeDist = maxSpeed / self.parameters.factorProp
	if dist < brakeDist then
		brakeDist = dist
	end

	local v_robot

	local k = self.parameters.factorProp/1

	local accelerationFactor = 0.8
	local accelerate = math.abs(self._robot.acceleration
			and self._robot.acceleration.aSpeedupFMax or 1.0) * accelerationFactor
	local brake = math.abs(self._robot.acceleration
			and self._robot.acceleration.aBrakeSMax or 1.0) * accelerationFactor
	local v = robotSpeed:length()

	self.v_last = self.v_last or v
	local brake2 = 1*brake
	local faktor_e = 2;
	if 0.5*v*v/brake+0.1 > dist  then -- bremsen
		--log("break")
		if v > brake/k then
		v_robot = self.v_last - brake*World.TimeDiff
		--	v_robot = self.v_last - brake*World.TimeDiff
		elseif v <= brake/k and k*dist <= brake/k then
			local v_theo
			v_theo = k*dist
			if v_theo > v then
				v_robot = self.v_last + accelerate*0.0001*(v_theo-v)
				log("da")
			else
				--log("else")
				v_robot = k*dist
			end
		else
			v_robot = v --- brake*World.TimeDiff
		end
	elseif  v < maxSpeed then
		v_robot = self.v_last + accelerate*World.TimeDiff
	else
		v_robot = maxSpeed
	end

	if v_robot > self._robot.maxSpeed then
		v_robot = self._robot.maxSpeed
	end

	self._counter = self._counter ~= nil and self._counter + 1 or 1
	--alle 10 schritte:
	if self._counter == 20 then
		self.v_last = v
		self._counter = 0
	else
		self.v_last = v_robot
	end

	local nextPoint = Vector(waypoints[1].p_x, waypoints[1].p_y)

	local speed = (nextPoint - robotPos):setLength(v_robot)

	local time = (dist - brakeDist) / self._robot.maxSpeed + (1 / self.parameters.factorProp) * (math.log(brakeDist) + 4.60517) --4.6 is log(100)
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

--return OldController
return require "trajectory/curvedmaxaccel"
