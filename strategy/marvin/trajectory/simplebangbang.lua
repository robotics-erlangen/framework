local SimpleBangBang = (require "../base/class").new("Trajectory.SimpleBangBang", (require "../base/trajectory").Base)
local Coordinates = require "../base/coordinates"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local World = require "../base/world"

-- 1D bang bang trajectory
function SimpleBangBang:_init()
end

function SimpleBangBang:_getPath(targetPos)
	local targetPos = Coordinates.toGlobal(targetPos)
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	
	self._robot.path:setProbabilities(0.1, 0.9)
	local waypoints = self._robot.path:get(robotPos.x, robotPos.y, targetPos.x, targetPos.y)
	-- first waypoint is the current robot position
	if #waypoints <= 1 then -- no waypoints left
		if robotPos:distanceTo(targetPos) > 0.01 then
			vis.addCircleRaw("waypoints", robotPos, 0.05, vis.colors.pinkHalf)
		end
		return {}, 0
	end
	
	-- draw waypoints and caculate distance
	local prev = robotPos
	local dist = 0
	for i=2, #waypoints do
		local cur = Vector.create(waypoints[i].p_x, waypoints[i].p_y)
		vis.addPathRaw("waypoints", {prev, cur}, vis.colors.yellow)
		dist = dist + cur:distanceTo(prev)
		prev = cur
	end
	
	return waypoints, dist
end

function SimpleBangBang:_removeDuplicates(list)
	local unique = {}
	local last = {}
	for _, val in pairs(list) do
		if last[1] ~= val[1] or last[2] ~= val[2] then
			table.insert(unique, val)
		end
		last = val
	end
	return unique
end

function SimpleBangBang:_create1DProfile(currentSpeed, endSpeed, maxSpeed, accelerate, brake, dist)
	-- FIXME handle moving into the opposite direction
	-- gracefully handle robot being too fast
	currentSpeed = math.bound(-maxSpeed, currentSpeed, maxSpeed)
	endSpeed = math.bound(-maxSpeed, endSpeed, maxSpeed)
	local speeds = nil
	-- check if robot is still able to reach its end speed
	if currentSpeed < endSpeed then
		local minTime = (endSpeed - currentSpeed) / accelerate
		local minDist = currentSpeed * minTime + accelerate * minTime * minTime * 0.5
		if dist < minDist then
			-- only accelerate
			speeds = { {0, currentSpeed}, {minTime, endSpeed} }
		end
	else
		local minTime = (endSpeed - currentSpeed) / brake
		local minDist = currentSpeed * minTime + brake * minTime * minTime * 0.5
		if dist < minDist then
			-- only brake
			speeds = { {0, currentSpeed}, {minTime, endSpeed} }
		end
	end
	
	if not speeds then
		local accelTime = (maxSpeed - currentSpeed) / accelerate
		local accelDist = currentSpeed * accelTime + accelerate * accelTime * accelTime * 0.5
	 	
	 	local brakeTime = (maxSpeed - endSpeed) / -brake
	 	local brakeDist = maxSpeed * brakeTime + brake * brakeTime * brakeTime * 0.5
	 	
	 	local midDist = dist - accelDist - brakeDist
	 	if midDist < 0 then
	 		-- t_mid
	 		-- solve(v_0+a_a*t_mid=-t_end*a_b+t_mid*a_b+v_e,t_end); use for t_end
	 		-- assume(a_a > 0);
			-- assume(a_b < 0);
			-- integrate(v_0+a_a*t,t,0,t_mid)+integrate(-t_end*a_b+t*a_b+v_e,t,t_mid,t_end)=d;
	 		local a_a, a_b = accelerate, brake
	 		local v_0, v_e = currentSpeed, endSpeed
	 		local d = dist
	 		local t_mid = -(math.sqrt(a_a-a_b)*math.sqrt(a_a*v_e*v_e-a_b*v_0*v_0-2*a_a*a_b*d)+(a_b-a_a)*v_0)/(a_a*a_b-a_a*a_a)
	 		local t_end = (v_e-v_0+(a_b-a_a)*t_mid)/a_b
	 		speeds = { {0, currentSpeed}, {t_mid, currentSpeed + t_mid*a_a}, {t_end, endSpeed} }
	 	else
	 		local midTime = midDist / maxSpeed
	 		-- accel, v_max, brake
	 		speeds = { {0, currentSpeed}, {accelTime, maxSpeed}, {accelTime + midTime, maxSpeed},
	 				{accelTime + midTime + brakeTime, endSpeed} }
	 	end
	end
	return self:_removeDuplicates(speeds)
end

local function offsetTime(param, o) -- o = time offset
	return {
		a0 = param.a0 - param.a1 * o + param.a2 * o^2 - param.a3 * o^3,
		a1 = param.a1 - 2 * param.a2 * o + 3 * param.a3 * o^2,
		a2 = param.a2 - 3 * param.a3 * o,
		a3 = param.a3
	}
end

function SimpleBangBang:_createTrajectory(path, speeds, targetPos)
	targetPos = Coordinates.toGlobal(targetPos)

	local pathIdx = 2
	local speedIdx = 2

	--log(#path .. " " .. #speeds .. " " .. tostring(Vector.create(path[#path].p_x, path[#path].p_y)))

	local curPos = Vector.create(path[1].p_x, path[1].p_y)
	local curSpeed = speeds[1][2]
	local curTime = 0

	local spline = {}

	local ctr = 0
	while true do
		local speedEntry = (speedIdx > #speeds) and speeds[#speeds] or speeds[speedIdx]
		local pathEntry = (pathIdx > #path) and path[#path] or path[pathIdx]

		local switchTime = speedEntry[1] - curTime
		local switchAccel = (speedEntry[2] - curSpeed) / switchTime
		if switchTime == 0 then
			switchAccel = 0
		end
		assert(switchTime >= 0, "oh no, get back to the future")

		local nextPathPos = Vector.create(pathEntry.p_x, pathEntry.p_y)
		local distLeft = nextPathPos:distanceTo(curPos)
		local accelDist = curSpeed * switchTime + switchTime * switchTime / 2 * switchAccel

		local t_start = curTime
		local oldCurPos = curPos
		local oldCurSpeed = curSpeed

		if ctr >= #speeds + #path then
			local msg = ""
			for i, s in pairs(speeds) do
				msg = msg + "\n" + (i .. " " .. s[1] .. " " .. s[2])
			end
			for _, p in pairs(spline) do
				msg = msg + "\n" + (p.t_start .. " " .. p.t_end .. " " .. p.x.a0 .. " " .. p.x.a1 .. " " .. p.x.a2)
			end
			error(msg)
		end
		ctr = ctr + 1

		if distLeft < accelDist then
			--solve([integrate(v+a*t,t,0,t_end)=d], [t_end])
			local t1, t2 = math.solveSq(switchAccel/2, curSpeed, -distLeft)
			local leftTime = t1 or 0
			curPos = nextPathPos
			curSpeed = curSpeed + leftTime * switchAccel
			curTime = curTime + leftTime

			pathIdx = pathIdx + 1
		else
			local traveledDist = curSpeed * switchTime + switchAccel * switchTime * switchTime / 2
			curPos = curPos + (nextPathPos - curPos):setLength(traveledDist)
			curSpeed = curSpeed + switchTime * switchAccel
			curTime = curTime + switchTime

			speedIdx = speedIdx + 1
		end
		-- FIXME distLeft == accelDist

		local speed = (curPos - oldCurPos):setLength(oldCurSpeed)
		local accelLen = (curSpeed - oldCurSpeed)/(curTime - t_start)
		if accelLen ~= accelLen then
			accelLen = 0
		end
		local accel = (curPos - oldCurPos):setLength(accelLen)
		table.insert(spline, { t_start = t_start - 0.02, t_end = curTime - 0.02,
			x = offsetTime({ a0 = oldCurPos.x, a1 = speed.x, a2 = accel.x/2, a3 = 0 }, t_start - 0.02),
			y = offsetTime({ a0 = oldCurPos.y, a1 = speed.y, a2 = accel.y/2, a3 = 0 }, t_start - 0.02),
			phi = { a0 = targetDir, a1 = 0, a2 = 0, a3 = 0}
		})

		if speedIdx >= #speeds and pathIdx >= #path then
			break
		end
		if (speedIdx >= #speeds and targetPos:distanceTo(curPos) < 0.001) then
			error("abcd")
			break
		end
	end

	return spline, curPos
end

function SimpleBangBang:_injectAngularSpeeds(spline, angularSpeeds, angularDirection, startAngle)
	local angularIdx = 2
	local newSpline = {}

	local currentDir = startAngle
	local currentOmega = angularSpeeds[1][2]
	local currentTime = -0.02

	for _, chunk in ipairs(spline) do
		local isEnd = false
		while not isEnd and currentTime ~= math.huge do
			local oldDir = currentDir
			local oldOmega = currentOmega
			local t_start = currentTime
			local angularEntry = (angularIdx > #angularSpeeds) and angularSpeeds[#angularSpeeds] or angularSpeeds[angularIdx]

			if angularIdx <= #angularSpeeds and angularEntry[1] - 0.02 < chunk.t_end then
				currentTime = angularEntry[1] - 0.02
				angularIdx = angularIdx + 1
			else
				isEnd = true
				currentTime = chunk.t_end
			end

			local timeDiff = currentTime - t_start
			if timeDiff == math.huge then
				timeDiff = 0
			end
			local nextOmega = angularDirection * angularEntry[2]
			local angleAccel = (nextOmega - oldOmega) / (angularEntry[1] - 0.02 - t_start) 
			if angularEntry[1] - 0.02 <= t_start then
				angleAccel = 0
			end
			currentOmega = oldOmega + timeDiff * angleAccel
			currentDir = oldDir + timeDiff * oldOmega + timeDiff * timeDiff / 2 * angleAccel

			
			if currentOmega > 20 then
				msg = "old" .. t_start .. " " .. oldDir .. " " .. oldOmega
				msg = msg + "\n" + ("t" .. currentTime .. " " .. currentDir .. " " .. currentOmega .. " " .. nextOmega .. " " .. oldOmega)
				for i, s in pairs(angularSpeeds) do
					msg = msg + "\n" + (i .. " " .. s[1] .. " " .. s[2])
				end
				for _, p in pairs(newSpline) do
					msg = msg + "\n" + (p.t_start .. " " .. p.t_end .. " " .. p.phi.a0 .. " " .. p.phi.a1 .. " " .. p.phi.a2)
				end
				error(msg)
			end

			table.insert(newSpline, { t_start = t_start, t_end = currentTime,
				x = chunk.x, y = chunk.y,
				phi = offsetTime({ a0 = oldDir, a1 = oldOmega, a2 = angleAccel/2, a3 = 0}, currentTime)
			})
		end
	end

	return newSpline
end

--FIXME pos trajektorie erzeugen
--FIXME phi trajektorie erzeugen
--FIXME beides mergen

function SimpleBangBang:update(targetPos, targetDir, maxSpeed, endSpeed)
	maxSpeed = maxSpeed or self._robot.maxSpeed
	endSpeed = endSpeed or Vector.create(0, 0)
	local endSpeedLen = endSpeed:length()
	-- FIXME handle moving into the opposite direction
	local currentSpeed = Coordinates.toGlobal(self._robot.speed):length()

	local waypoints, dist = self:_getPath(targetPos)
	if #waypoints == 0 then -- no waypoints left
		return {}, targetPos, 0
	end

	local accelerationFactor = 0.8
	local accelerate = math.abs(self._robot.acceleration 
			and self._robot.acceleration.aSpeedupFMax or 1.0) * accelerationFactor
	local brake = -math.abs(self._robot.acceleration 
			and self._robot.acceleration.aBrakeFMax or 1.0) * accelerationFactor
	
	local speeds = self:_create1DProfile(currentSpeed, endSpeedLen, maxSpeed, accelerate, brake, dist)

 	-- ignore waypoint direction for now
 	local robotDir = Coordinates.toGlobal(self._robot.dir)
 	targetDir = Coordinates.toGlobal(targetDir)
 	local angleError = geom.getAngleDiff(robotDir, targetDir)

 	local rotateSpeed = self._robot.angularSpeed
 	local maxRotateSpeed = self._robot.maxAngularSpeed

 	local rotateAccel = math.abs(self._robot.acceleration 
 			and self._robot.acceleration.aSpeedupPhiMax or 5.0) * accelerationFactor
 	local rotateBrake = -math.abs(self._robot.acceleration 
 			and self._robot.acceleration.aBrakePhiMax or 5.0) * accelerationFactor
 	local absAngleError = math.abs(angleError)

	local angularSpeeds = self:_create1DProfile(math.sign(angleError) * rotateSpeed, 0, maxRotateSpeed,
			rotateAccel, rotateBrake, absAngleError)

	local spline, endPos = self:_createTrajectory(waypoints, speeds, targetPos)
	local endTime = spline[#spline].t_end
	table.insert(spline, { t_start = endTime, t_end = math.huge,
		x = offsetTime({ a0 = endPos.x, a1 = endSpeed.x, a2 = 0, a3 = 0 }, endTime),
		y = offsetTime({ a0 = endPos.y, a1 = endSpeed.y, a2 = 0, a3 = 0 }, endTime)
	})

	spline = self:_injectAngularSpeeds(spline, angularSpeeds, math.sign(angleError), robotDir)

	return {spline = spline}, targetPos, endTime
end

function SimpleBangBang:canHandle(targetPos, targetDir, maxSpeed, endSpeed)
	return true
end

return SimpleBangBang
