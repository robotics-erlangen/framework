local CurvedMaxAccel = Class("Trajectory.CurvedMaxAccel", (require "../base/trajectory").Base)

local Coordinates = require "../base/coordinates"
local geom = require "../base/geom"
local plot = require "../base/plot"
local vis = require "../base/vis"
local World = require "../base/world"


function CurvedMaxAccel:_init()
	self._lastTargetDir = nil
	self._lastTime = nil
end

function CurvedMaxAccel:_getPath(targetPos)
	targetPos = Coordinates.toGlobal(targetPos)
	local robotPos = Coordinates.toGlobal(self._robot.pos)

	self._robot.path:setProbabilities(0.15, 0.65)
	-- first waypoint is the current robot position
	-- if reaching the end is possible there's a waypoint at the end
	local waypoints = self._robot.path:get(robotPos.x, robotPos.y, targetPos.x, targetPos.y)

	-- convert waypoints to vectors and draw
	local waypointsVector = {}
	for i = 1, #waypoints do
		table.insert(waypointsVector, Vector(waypoints[i].p_x, waypoints[i].p_y))
	end

	local waypointsColor = vis.colors.yellow
	if waypointsVector[#waypointsVector]:distanceTo(targetPos) > 0.01 then
		-- orange path if target can't be reached
		waypointsColor = vis.colors.orange
	end
	-- draw all at once
	vis.addPathRaw("waypoints", waypointsVector, waypointsColor)

	if #waypointsVector <= 1 then -- no waypoints
		if robotPos:distanceTo(targetPos) > 0.01 then
			-- no way to target
			vis.addCircleRaw("waypoints", robotPos, 0.05, vis.colors.orangeHalf)
		end
		return {}
	elseif #waypointsVector == 2 then
		-- distance error < 0.1 mm
		if waypointsVector[1]:distanceTo(waypointsVector[2]) < 0.0001 then
			return {}
		end
	end

	return waypointsVector
end

-- preprocess the waypoints to ensure that the first corner is more or less
-- in the direction the robot is currently moving into
local function _preprocessPath(waypoints, maxError, robotPos, robotSpeed)
	-- move the next waypoint inwards if we will miss it
	local startDir = waypoints[2] - waypoints[1]
	if startDir:dot(robotSpeed) > 0 and robotSpeed:length() > 0.1 and #waypoints >= 3 then
		local perpendicular = robotSpeed:perpendicular():setLength(1)
		local cornerPos, lambda1, lambda2 = geom.intersectLineLine(robotPos, robotSpeed, waypoints[2], perpendicular)
		local angleDiff = startDir:angleDiff(waypoints[3] - waypoints[2])
		-- only move the cornerPos inwards
		if cornerPos and lambda1 > 0 and angleDiff * lambda2 < 0 then
			-- limit the movement a bit
			local magicScale = math.sqrt(2)/2
			waypoints[2] = waypoints[2] + perpendicular * (math.bound(-maxError, lambda2, maxError) * magicScale)
			-- vis.addCircleRaw("waypoints", waypoints[2], 0.03, vis.colors.green)
		end
	end
end

-- create a list of segments with speedLimits at their start and end
-- idea: instead of targeting the next path corner, target a point some time
-- in the future (point depents on robot velocity!). This causes the robot
-- to drive on an approximatelly circular trajectory, the calculations are done using
-- the osculating circle and the path curvature. Then limit the speed in corners
-- such that the centripetal force doesn't exceed the possible sidewards acceleration
local function _calculateCurveSpeedLimits(waypoints, accelLimit, maxSpeed, maxError, startSpeed, endSpeed)
	-- ignore angle between current robot speed and move destination
	-- this only leads to problems if the path is changing fast
	local lastPathDir = waypoints[2] - waypoints[1]
	-- max distance from corner where the circular trajectory may start
	local xRemaining = lastPathDir:length()
	local prev = waypoints[2]

	-- {startSpeed, endSpeed, distance, linearSpeedChange}
	-- if not linear, then startSpeed is the maximum allowed speed, brakes down to endSpeed as late as possible
	-- !!! for every entry except the first: distance ~= 0 !!!
	local maxSpeedProfile = { {startSpeed, maxSpeed, 0} }

	-- to calculate an angle two line segments are necessary
	for i = 3, #waypoints do
		local newPathDir = waypoints[i] - prev
		-- limit angle for extremely sharp corners
		local angleDiff = math.min(lastPathDir:absoluteAngleDiff(newPathDir), math.pi - 0.001)

		-- next to straight line or too small path segment for a stable direction
		if angleDiff < 0.001 or lastPathDir:length() < 0.005 then
			if xRemaining > 0 then -- don't create empty segments
				table.insert(maxSpeedProfile, {maxSpeed, maxSpeed, xRemaining}) -- just a straight line segment
				-- vis.addPathRaw("waypoints"..tostring(i), {prev - lastPathDir, prev}, vis.colors.blue)
			end
			-- no curve -> new path segment can be used completely
			xRemaining = newPathDir:length()
		else
			-- TODO use corridor width for maxError calculation
			local angleSin = math.sin((math.pi - angleDiff)/2)
			local angleTan = math.tan((math.pi - angleDiff)/2)
			local radius = maxError * angleSin / (1 - angleSin) -- osculating circle radius
			local maxRadius = maxSpeed * maxSpeed / accelLimit -- no speed benefit from larger radius
			radius = math.min(radius, maxRadius)

			-- possible speed at circle start
			local possibleStartRadius = xRemaining * angleTan -- limit circle radius to available space
			local startRadius = math.min(radius, possibleStartRadius)
			local maxStartSpeed = math.sqrt(startRadius * accelLimit)

			-- possible speed at circle end
			-- TODO improve switch point calculation
			local xMaxNext = newPathDir:length() * 0.5
			local possibleEndRadius = xMaxNext * angleTan -- limit circle radius to available space
			local endRadius = math.min(radius, possibleEndRadius)
			local maxEndSpeed = math.sqrt(endRadius * accelLimit)

			-- time and speed calculation
			local startDist = startRadius * (1 / angleTan)
			local endDist = endRadius * (1 / angleTan)
			-- ensure that startSpeed is still usable when the robot has nearly reached the corner
			if i == 3 and startDist < endDist then
				maxStartSpeed = maxEndSpeed
				startDist = endDist
			end
			-- just another estimation
			local actualDist = angleDiff * (startRadius + endRadius) * 0.5
			if xRemaining > startDist then
				table.insert(maxSpeedProfile, {maxSpeed, maxSpeed, xRemaining - startDist}) -- straight line segment
				-- vis.addPathRaw("waypoints"..tostring(i), {prev - lastPathDir:copy():setLength(xRemaining), prev - lastPathDir:copy():setLength(startDist)}, vis.colors.blue)
			end
			table.insert(maxSpeedProfile, {maxStartSpeed, maxEndSpeed, actualDist, true}) -- curved part
			--vis.addPathRaw("waypoints"..tostring(i), {prev - lastPathDir:copy():setLength(startDist), prev + newPathDir:copy():setLength(endDist)}, vis.colors.blue)
			xRemaining = newPathDir:length() - endDist -- >= newPathDir:length() / 2
		end
		-- update path segments
		lastPathDir = newPathDir
		prev = waypoints[i]
	end

	if xRemaining > 0 then
		table.insert(maxSpeedProfile, {maxSpeed, endSpeed, xRemaining}) -- end segment
		--vis.addPathRaw("waypoints".."End", {prev - lastPathDir:copy():setLength(xRemaining), prev}, vis.colors.blue)
	end

	return maxSpeedProfile
end

-- brake must be a negative value
-- ensures that the speedProfile ends with at most maxSpeed
-- if braking is necessary this is down with the deceleration brake
local function _backpropagateSpeedLimit(speedProfile, maxSpeed, brake)
	-- no need to slow down
	if speedProfile[#speedProfile][2] <= maxSpeed then
		return
	end

	-- main idea:
	-- the current robot speed is too high
	-- thus start braking earlier as brake is the fastest possible deceleration
	-- the new speed will always be lower than the old one, except for the injectTime
	-- The injectTime is required to keep the total distance unchanged
	-- TODO robot could be faster during time injection
	local endTime = speedProfile[#speedProfile][1] -- end time of the speed profile
	if endTime == 0 then -- empty speed profile
		table.truncate(speedProfile, 0)
		table.insert(speedProfile, {0, maxSpeed})
		return
	end
	local distance = 0
	for i = #speedProfile - 1, 1, -1 do
		local entry = speedProfile[i]
		local nextEntry = speedProfile[i+1] -- only used for acceleration calculations

		-- max possible speed at the current time to allow braking down to maxSpeed
		-- actually just an approximation as the distance travelled while braking
		-- is less than the distance travelled with the original speed
		distance = distance + (nextEntry[2] + entry[2]) / 2 * (nextEntry[1] - entry[1]) -- integrate distance
		-- distance and start speed for braking over the distance
		local fullBrakeTime = (-maxSpeed + math.sqrt(maxSpeed*maxSpeed-2*brake*distance)) / (-brake)
		local maxTimedSpeed = maxSpeed - brake * fullBrakeTime
		-- can brake starting from the current entry
		if entry[2] < maxTimedSpeed then -- skips entries with zero timediff
			-- acceleration currently used by the entry, always > brake
			local oldAccel = (nextEntry[2] - entry[2]) / (nextEntry[1] - entry[1])
			-- entry[2] is less then maxTimedSpeed
			-- thus just cut the old speed curve with the brake curve
			-- time relative to entry[1]
			local switchAfter = (maxTimedSpeed - entry[2]) / (oldAccel - brake)
			local switchTime = entry[1] + switchAfter
			local switchSpeed = entry[2] + switchAfter * oldAccel -- speed at the switch point

			-- time required to slow down to maxSpeed
			local brakeTime = (switchSpeed - maxSpeed) / (-brake)

			-- previous speed was higher thus a larger distance was travelled
			-- just keep the speed at the switch point until the missing distance is covered
			-- this is not the optimum but saves from doing a lot of corner case handling
			local missingDistance = distance - (entry[2] + switchSpeed) / 2 * switchAfter
					- (switchSpeed + maxSpeed) / 2 * brakeTime
			local injectTime = math.max(0, missingDistance / switchSpeed)

			if oldAccel > 0 then
				-- Fomulas for wxMaxima
				--solve(v_0=v_0+a*t_mid+b*(t_end-t_mid),t_end);
				--assume(a > 0);assume(b < 0);assume(d > 0);assume(t_end>t_mid);
				--ratsimp(integrate(v_0+a*t,t,0,t_mid)+integrate(v_0+a*t_mid+b*(t-t_mid),t,t_mid,t_end)=d);
				local v_0,a,b,d = switchSpeed,oldAccel,brake,missingDistance
				local t1, _ = math.solveSq(b-a, 2*(b-a)*v_0, -2*b*d)
				if t1 and t1 > 0 then
					switchTime = switchTime + t1
					switchSpeed = switchSpeed + t1 * oldAccel
					injectTime = 0
					brakeTime = (switchSpeed - maxSpeed) / (-brake)
				end
			end

			-- remove all speed entries after the current one
			table.truncate(speedProfile, i)
			if switchSpeed ~= entry[2] then -- just a duplicate
				table.insert(speedProfile, {switchTime, switchSpeed}) -- remaining part with old accel
			end
			if injectTime > 0 then
				table.insert(speedProfile, {switchTime + injectTime, switchSpeed}) -- injected speed
			end
			table.insert(speedProfile, {switchTime + injectTime + brakeTime, maxSpeed}) -- brake to maxSpeed
			return
		end
	end

	-- special case, robot starts too fast, just cut down the initial speed
	local startSpeed = speedProfile[1][2]
	-- time required for braking on that distance
	endTime = 2 * distance / (startSpeed + maxSpeed)
	-- replace speedProfile entries
	table.truncate(speedProfile, 0)
	table.insert(speedProfile, {0, startSpeed})
	table.insert(speedProfile, {endTime, maxSpeed})
end

-- assumes that the startSpeed limit is not violated by speedProfile!
local function _addLinearSpeedSegment(speedProfile, startSpeed, endSpeed, distance, accelerate, brake)
	local startEntry = speedProfile[#speedProfile]
	local startTime = startEntry[1]
	local speed = startEntry[2]
	assert(startSpeed >= speed, "invalid speedProfile")

	local accelTime = 0
	local accel = accelerate

	local linearAccel = (endSpeed - speed) / distance * (endSpeed + speed) / 2
	if linearAccel > accelerate or linearAccel < brake then
		-- too slow or too fast to reach endSpeed
		accel = math.bound(brake, linearAccel, accelerate)
		-- linearAccel is either brake or accelerate
		accelTime = (-speed + math.sqrt(speed*speed+2*accel*distance))/accel
	elseif startSpeed == endSpeed then
		-- time required for distance if permanently accelerating with accelerate
		accelTime = (-speed + math.sqrt(speed*speed+2*accelerate*distance))/accelerate
		-- limit to time required for reaching maxSpeed (= startSpeed or endSpeed)
		accelTime = math.min(accelTime, (startSpeed - speed) / accelerate)
	elseif speed < startSpeed - 0.001 then
		-- Fomulas for wxMaxima
		--solve(v_0+a*t_mid=v_s+(v_e-v_s)*t_mid/t_end,t_end); -> set t_end to result
		--assume(a > (v_e-v_s)/t_end);assume(a > 0);assume(d > 0);
		--solve(integrate(v_0+a*t,t,0,t_mid)+integrate(v_s+(v_e-v_s)*t/t_end,t,t_mid,t_end)=d,t_mid);
		local a,d,v_0,v_s,v_e = accelerate,distance,speed,startSpeed,endSpeed
		accelTime = (math.sqrt((4*v_0*v_0+8*a*d)*v_s*v_s+(-4*v_0*v_e*v_e-4*v_0*v_0*v_0-8*a*d*v_0)*v_s+v_e*v_e*v_e*v_e
			+(2*v_0*v_0-4*a*d)*v_e*v_e+v_0*v_0*v_0*v_0+4*a*d*v_0*v_0+4*a*a*d*d)-2*v_0*v_s+v_e*v_e+v_0*v_0-2*a*d)/(2*a*v_s-2*a*v_0)
	end
	-- nothing to do if startSpeed == speed
	-- acceleration part
	if accelTime > 0 then
		local accelSpeed = speed + accelTime * accel
		table.insert(speedProfile, {startTime + accelTime, accelSpeed})
		-- update time and remaining distance
		startTime = startTime + accelTime
		distance = distance - accelTime * (speed + accelSpeed) / 2
		startSpeed = accelSpeed -- speed at start of the linear segment
	end

	-- work around numerical precision problem
	if distance > 0.00001 then -- robot is driving with startSpeed
		--solve(integrate(v_s+(v_e-v_s)/t_end*t,t,0,t_end)=d,t_end);
		local linTime = (2 * distance)/(startSpeed + endSpeed)
		table.insert(speedProfile, {startTime + linTime, endSpeed})
	end
end

-- accelerate must be a positive value
-- brake must be a negative value
-- speed profile for forward movement, the speed limits in maxSpeedProfile are derived from sidewards movement limits
local function _calculate1DSpeedProfile(maxSpeedProfile, accelerate, brake)
	local speedProfile = { {0, maxSpeedProfile[1][1]} } -- begin with start speed
	local initialSpeed = speedProfile[1][2]
	-- handle negative start speed by braking and moving back
	if initialSpeed < 0 then
		local brakeTime = initialSpeed / brake
		local brakeDist = (-initialSpeed)/2 * brakeTime
		table.insert(speedProfile, {brakeTime, 0})
		assert(brakeTime >= 0, "invalid brake time")
		-- move back to start point
		local vrestore = math.sqrt(2 * accelerate * brakeDist)
		local restoreTime = vrestore / accelerate
		table.insert(speedProfile, {brakeTime + restoreTime, vrestore})
	end

	-- skip maxSpeedProfile entry containing the current robot and max speed
	for i = 2, #maxSpeedProfile do
		local segment = maxSpeedProfile[i]
		local startSpeed = segment[1]
		local endSpeed = segment[2]
		local distance = segment[3]
		local linearSpeedChange = segment[4]

		-- ensure that the startSpeed limit is respected
		_backpropagateSpeedLimit(speedProfile, startSpeed, brake)

		if linearSpeedChange then -- used for curves
			_addLinearSpeedSegment(speedProfile, startSpeed, endSpeed, distance, accelerate, brake)
		else -- accelerate to at most start speed
			_addLinearSpeedSegment(speedProfile, startSpeed, startSpeed, distance, accelerate, brake)
		end
		-- add braking down to endSpeed
		_backpropagateSpeedLimit(speedProfile, endSpeed, brake)
	end

	return speedProfile
end

local function _decreaseDistance(speedProfile, cutoffDistance)
	local currentDistance = 0
	local cutoffAfter = 1 -- always keep the first speedProfile segment
	for i = #speedProfile - 1, 1, -1 do
		local segmentDistance = (speedProfile[i+1][2] + speedProfile[i][2]) / 2 * (speedProfile[i+1][1] - speedProfile[i][1])

		if currentDistance <= cutoffDistance and cutoffDistance < currentDistance+segmentDistance then
			local accel = (speedProfile[i+1][2] - speedProfile[i][2]) / (speedProfile[i+1][1] - speedProfile[i][1])
			local endSpeed = speedProfile[i+1][2]
			local distLeft = cutoffDistance - currentDistance
			-- calculate time from end of the segment
			local time
			if accel == 0 then
				time = distLeft / endSpeed
			else
				time = (-endSpeed + math.sqrt(endSpeed*endSpeed-2*accel*distLeft)) / -accel
			end
			speedProfile[i+1][1] = speedProfile[i+1][1] - time
			speedProfile[i+1][2] = speedProfile[i][2] + (speedProfile[i+1][1] - speedProfile[i][1]) * accel
			currentDistance = cutoffDistance
			cutoffAfter = i+1
			break
		else
			currentDistance = currentDistance + segmentDistance
		end
	end
	table.truncate(speedProfile, cutoffAfter)
	return currentDistance
end

local function _injectExponentialFalloff(speedProfile, exponentialTime, exponentialError, brake, endSpeedLen)
	-- FIXME? may ignore maxSpeed
	-- handle exponential falloff
	if speedProfile[#speedProfile][2] >= endSpeedLen -- too fast -> exponential falloff
		and speedProfile[#speedProfile-1][2] > speedProfile[#speedProfile][2] then -- decelerating
		-- v(t) = v_0 * e^(-k*t)  <--> v(dist) = k*dist
		-- v_0 = expStartSpeed
		-- v'(0) = brake -> k = 1/exponentialTime
		local k = 1 / exponentialTime
		local timeFactor = -math.log(exponentialError)
		local expStartSpeed = exponentialTime * -brake
		-- integrate v(t) from 0 to +inf + distance traveled with endSpeed
		local expDistance = expStartSpeed*exponentialTime
		local distance = expDistance + timeFactor*exponentialTime*endSpeedLen
		-- <= distance, < distance if speedProfile is too short
		local actualDistance = _decreaseDistance(speedProfile, distance)

		-- ignore the case that speedProfile < curSpeedLimit
		-- just drive with the calculated speed, this can cause the speed profile to be too "short"
		-- but as the moveTarget is selected before this doesn't matter
		-- it is also very complex too solve and only introduces a small error thus its not worth the trouble
		if actualDistance >= distance then -- not in exponential part
			local startSpeed = expStartSpeed + endSpeedLen
			_backpropagateSpeedLimit(speedProfile, startSpeed, brake)
		else
			-- assume target is reached if exponential part traveled a distance of (1-exponentialError)*expDistance
			-- solve integrate(expStartSpeed*%e^(-k*t)+endSpeed,t,0,t)=expDistance+endSpeed*fac-d for t
			-- actualDistance decreases when getting closer to the target
			local time = 2*exponentialTime -- initial guess
			local expTime = timeFactor*exponentialTime
			for _ = 1, 10 do
				local e = math.exp(-k*time)
				-- only consider endSpeedLen for a distance of expTime * endSpeedLen
				local err = math.max(0, time-expTime)*endSpeedLen-e*expDistance+actualDistance
				local diff
				if time < expTime then
					diff = expStartSpeed*e+endSpeedLen
				else
					diff = expStartSpeed*e
				end
				time = math.bound(0, time - err/diff, 10*exponentialTime)
			end

			timeFactor = math.max(0, timeFactor - time / exponentialTime)

			local curSpeedLimit = expStartSpeed*math.exp(-k*time) + endSpeedLen
			table.truncate(speedProfile, 0)
			table.insert(speedProfile, {0, curSpeedLimit})
			-- disable deceleration of controller for exponential part
			local timeQuantum = 0.001
			if timeFactor*exponentialTime > timeQuantum then
				table.insert(speedProfile, {timeQuantum, curSpeedLimit})
			end
		end

		-- fake end time
		local endTime = speedProfile[#speedProfile][1] + timeFactor*exponentialTime
		table.insert(speedProfile, {endTime, speedProfile[#speedProfile][2]})
	end
	return speedProfile
end

local function _calculateRotation(currentDir, currentOmega, targetDir, accelerate, brake, maxSpeed, exponentialTime)
	local fullBrakeTime = math.abs(currentOmega / brake)
	-- how far the robot will rotate even if it brakes with maximum speed
	local forcedRotation = math.sign(currentOmega) * -brake * fullBrakeTime * fullBrakeTime / 2

	-- FIXME assert: (maxSpeed/maxAccel)^2*maxSpeed/2 < math.pi

	-- required direction change
	local dirChange = geom.getAngleDiff(currentDir, targetDir)

	-- if the robot is fast enough that rotating with the opposite angle would be faster
	if math.abs(dirChange - forcedRotation) >= math.pi then
		if dirChange < 0 then
			dirChange = dirChange + 2*math.pi
		else
			dirChange = dirChange - 2*math.pi
		end
	end

	-- v(t) = v_0 * e^(-k*t)  <--> v(dist) = k*dist
	-- v_0 = expStartSpeed
	-- v'(0) = brake -> k = 1/exponentialTime
	local k = 1 / exponentialTime
	local expStartSpeed = exponentialTime * -brake
	-- integrate v(t) from 0 to +inf
	local expDistance = expStartSpeed*exponentialTime

	local outSpeed
	local outAccel

	if math.abs(dirChange) <= expDistance then
		-- exponential part
		outSpeed = math.bound(-maxSpeed, dirChange * k, maxSpeed)
		outAccel = 0 -- FIXME
	elseif math.sign(currentOmega) ~= math.sign(dirChange) then
		-- robot rotates into the wrong direciton
		outSpeed = currentOmega
		outAccel = math.sign(dirChange) * -brake
	elseif math.abs(currentOmega) <= expStartSpeed then
		-- robot is slower that the exponential start speed
		outSpeed = currentOmega
		outAccel = math.sign(dirChange) * accelerate
		if math.abs(outSpeed) > maxSpeed then
			outAccel = 0
		end
	else
		-- check whether the robot should brake yet or keep accelerating
		local brakeTime = (math.abs(currentOmega) - expStartSpeed) / -brake
		local brakeDist = expDistance + -brake * brakeTime * brakeTime / 2 + expStartSpeed * brakeTime

		if math.abs(dirChange) <= brakeDist then
			local remainingBrakeTime = math.solveSq(-brake/2, expStartSpeed, expDistance - brakeDist)
			assert(remainingBrakeTime >= 0)
			outSpeed = math.sign(dirChange) * (expStartSpeed + remainingBrakeTime * -brake)
			outAccel = math.sign(dirChange) * brake
		else
			-- speed-up
			local targetSpeed = math.abs(currentOmega)
			outAccel = math.sign(dirChange) * accelerate
			-- limit to maxSpeed
			if targetSpeed >= maxSpeed then
				targetSpeed = maxSpeed
				outAccel = 0
			end
			outSpeed = targetSpeed * math.sign(dirChange)
		end
	end

	return outSpeed, outAccel
end

local function _speedAtTime(speedProfile, time)
	local endIdx = #speedProfile + 1
	for i = 2, #speedProfile do
		if speedProfile[i][1] >= time then
			endIdx = i
			break
		end
	end
	if endIdx > #speedProfile then
		return speedProfile[#speedProfile][2]
	else
		local accel = (speedProfile[endIdx][2]-speedProfile[endIdx-1][2])/(speedProfile[endIdx][1]-speedProfile[endIdx-1][1])
		if speedProfile[endIdx][1] - speedProfile[endIdx-1][1] == 0 then
			-- segement has duration of 0 seconds
			accel = 0
		end
		return speedProfile[endIdx-1][2] + accel*(time - speedProfile[endIdx-1][1])
	end
end

local function _calculateSpeed(robotId, waypoints, maxSpeedProfile, speedProfile, robotSpeed, accelLimit, sidewardsErrorFactor, accelerationOverdrive)
	local timeOffset = 0.02
	local timeStep = 0.02
	local speed = _speedAtTime(speedProfile, timeOffset)
	local speedNextStep = _speedAtTime(speedProfile, timeOffset+timeStep)
	local accel = (speedNextStep-speed)*(1/timeStep)
	-- if target is reached
	if speedProfile[2][1] == speedProfile[1][1] then
		accel = 0
	end

	-- workaround for unwanted controller behavior; account for numerical precision errors
	if robotSpeed:length() < speed - 0.001 and accel < 0 then
		accel = 0 -- too slow, don't brake to allow the robot to get up to speed
	end

	if speed + accel * accelerationOverdrive < 0 then
		-- make sure the robot doesn't brake until it moves backwards
		speed = 0
		accel = 0
	end

	-- don't drive backwards, just brake as fast as possible
	speed = math.max(0, speed)
	local moveDir = waypoints[2] - waypoints[1]
	local speedVector = moveDir:copy():setLength(speed)
	local accelVector = moveDir:copy():setLength(accel)
	-- add overdrive to ensure that the robot reaches the expected de/acceleration
	speedVector = speedVector + accelVector * accelerationOverdrive

	plot.addPlot(tostring(robotId) .. ".speed", speed)
	--debug.set("speed", speedVector)
	--debug.set("accel", accelVector)

	if speedVector:length() >= 0.0001 then
		-- check if the robot is on a curve segment
		if #maxSpeedProfile >= 2 and maxSpeedProfile[2][4] then
			local forwardDir = moveDir:copy():normalize():dot(robotSpeed)
			-- add acceleration towards the curve center, reduce accerlation if the robot is slower than expected
			local angle = (waypoints[2] - waypoints[1]):angleDiff(waypoints[3] - waypoints[2])
			local scale = math.bound(0.02, math.min(forwardDir, speed) / math.max(maxSpeedProfile[2][1], maxSpeedProfile[2][2]), 1)
			accelVector = accelVector - moveDir:perpendicular():setLength(math.sign(angle) * accelLimit * scale * scale)
		end
		-- calculate how fast the robot is moving perpendicular to the speedVector
		-- add acceleration in the opposite direction
		local sidewardSpeed = moveDir:perpendicular():normalize()
		sidewardSpeed:setLength(-sidewardSpeed:dot(robotSpeed) * sidewardsErrorFactor)
		accelVector = accelVector + sidewardSpeed
	end

	return speedVector, accelVector
end


function CurvedMaxAccel:update(targetPos, targetDir, maxSpeed, endSpeed, accelScale, dribble)
	if targetPos == nil then
		error("targetPos is nil")
	end

	local directionVector = Vector.fromAngle(targetDir):scaleLength(0.09)
	vis.addPath("MoveTo", {targetPos, targetPos + directionVector}, vis.colors.yellowHalf)


	-- configuration
	local maxError = 0.03 -- maxError in meters when driving a curve
	local accelerationFactor = (accelScale or 1.0) * 0.85 -- factor for max forward speedup and braking
	local exponentialTime = 0.1 -- timespan in seconds replace with exponential falloff
	local exponentialError = 0.2 -- relative
	local sidewardsErrorFactor = 10 -- used to scale sidewards speed error
	local accelerationOverdrive = 0.02 -- Send commands with too high speed to make sure the robot de/accelerates fast enough

	local rotationExponentialTime = 0.1
	local rotationAccelerationFactor = 0.8

	--insert default values
	maxSpeed = maxSpeed or self._robot.maxSpeed
	if World.RefereeState == "Stop" or World.RefereeState == "BallPlacementDefensive"
			or World.RefereeState == "BallPlacementOffensive" then
		maxSpeed = math.min(maxSpeed, World.IsLargeField and 1.5 or 1)
	end
	-- change endSpeed to global coordinates
	endSpeed = endSpeed and Coordinates.toGlobal(endSpeed) or Vector(0, 0)

	-- helper variables
	local robotPos = Coordinates.toGlobal(self._robot.pos)
	local robotSpeed = Coordinates.toGlobal(self._robot.speed)
	local robotDir = Coordinates.toGlobal(self._robot.dir)

	local rotAccelerate = math.abs(self._robot.acceleration
			and self._robot.acceleration.aSpeedupPhiMax or 1.0) * rotationAccelerationFactor
	local rotBrake = -math.abs(self._robot.acceleration
			and self._robot.acceleration.aBrakePhiMax or 1.0) * rotationAccelerationFactor
	local rotMaxSpeed = self._robot.maxAngularSpeed

	local angularSpeed, angularAccel = _calculateRotation(robotDir, self._robot.angularSpeed, Coordinates.toGlobal(targetDir),
			rotAccelerate, rotBrake, rotMaxSpeed, rotationExponentialTime)
	if self._lastTime then
		-- feedforward of target direction change
		-- as tracking a direction only works if it changes slow enough, using feedforwad shouldn't cause any trouble
		local directionChange = (targetDir - self._lastTargetDir) / (World.Time - self._lastTime)
		angularSpeed = angularSpeed + directionChange
	end
	self._lastTargetDir = targetDir
	self._lastTime = World.Time

	local waypoints = self:_getPath(targetPos)
	if #waypoints == 0 then -- no waypoints left, just stay here but also update the orientation
		local spline = { {t_start = 0, t_end = math.huge,
			x = { a0 = robotPos.x, a1 = endSpeed.x, a2 = 0, a3 = 0 },
			y = { a0 = robotPos.y, a1 = endSpeed.y, a2 = 0, a3 = 0 },
			phi = { a0 = robotDir, a1 = angularSpeed, a2 = angularAccel / 2, a3 = 0}
		} }
		return {spline = spline}, targetPos, 0
	end

	-- no endspeed if the target can't be reached because it's in an obstacle
	-- must be calculated in all global coordinates
	if waypoints[#waypoints]:distanceTo(Coordinates.toGlobal(targetPos)) > 0.02 then
		endSpeed = Vector(0, 0)
	end

	-- get acceleration values
	-- maximum sidewards acceleration
	local accelLimit = math.abs(self._robot.acceleration.aSpeedupSMax)
	-- forward acceleration and deceleration
	local accelerate = math.abs(self._robot.acceleration.aSpeedupFMax) * accelerationFactor
	local brake = -math.abs(self._robot.acceleration.aBrakeFMax) * accelerationFactor * (dribble and 0.5 or 1)

	-- smooth first corner
	_preprocessPath(waypoints, maxError, robotPos, robotSpeed)

	-- calculate robot speed in target direction
	-- unexpected sidewards speed is handled in _calculateSpeed
	-- handling it here doesn't work as this adds a phantom speed
	local startSpeed = (waypoints[2] - waypoints[1]):normalize():dot(robotSpeed)
	-- handle endSpeed
	local endSpeedLen = math.max(0, (waypoints[#waypoints] - waypoints[#waypoints - 1]):normalize():dot(endSpeed))
	-- calculate speed limits for curve segments based on sidewards acceleration limits while driving curves
	local maxSpeedProfile = _calculateCurveSpeedLimits(waypoints, accelLimit, maxSpeed, maxError, startSpeed, endSpeedLen)
	--debug.set("maxSpeedProfile", maxSpeedProfile)
	-- convert to actual speed curve
	local speedProfile = _calculate1DSpeedProfile(maxSpeedProfile, accelerate, brake)
	--debug.set("speedProfile", speedProfile)

	_injectExponentialFalloff(speedProfile, exponentialTime, exponentialError, brake, endSpeedLen)
	--debug.set("speedProfile2", speedProfile)

	local speedVector, accelVector = _calculateSpeed(self._robot.id, waypoints, maxSpeedProfile, speedProfile, robotSpeed, accelLimit, sidewardsErrorFactor, accelerationOverdrive)

	local spline = { {t_start = 0, t_end = math.huge,
		x = { a0 = robotPos.x, a1 = speedVector.x, a2 = accelVector.x / 2, a3 = 0 },
		y = { a0 = robotPos.y, a1 = speedVector.y, a2 = accelVector.y / 2, a3 = 0 },
		phi = { a0 = robotDir, a1 = angularSpeed, a2 = angularAccel / 2, a3 = 0}
	} }

	local endTime = speedProfile[#speedProfile][1]
	return {spline = spline}, targetPos, endTime
end

function CurvedMaxAccel:canHandle()
	return true
end

return CurvedMaxAccel
