local Shoot = require "task/ability/shoot"
local ShootGoal = Class("Task.ShootGoal", require "task/base", Shoot)

local Cache = require "../base/cache"
local debug = require "../base/debug"
local Field = require "../base/field"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

local Ball = require "observer/ball"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local Shoot = require "observer/shoot"

local PathHelper = require "trajectory/pathhelper"
local Interval = require "util/interval"
local Random = require "util/random"





-- ===============================================
-- ===== VOLLEY RECEIPT POSITION CALCULATION =====
-- ===============================================

function ShootGoal:_rateShootPos(ballPos, targetPoint, targetWidth)
	-- rates the angle between the current ball speed and the future one
	-- 180       degrees -> 1.000
	-- 180 +-  1 degrees -> 0.975
	-- 180 +- 10 degrees -> 0.766
	-- 180 +- 80 degrees -> 0.000
	local angle = World.Ball.speed:absoluteAngleDiff(ballPos - targetPoint)
	local ratingAngle = math.max(0, 1 - angle / (80 * math.pi / 180))
	ratingAngle = ratingAngle

	-- rates the target width (angle of largest free goal sector, aka maxAngleError)
	-- 0  degrees -> 0
	-- 1  degree  -> 0.017
	-- 10 degrees -> 0.175
	local ratingTargetWidth = targetWidth

	-- rates the distance to any field border
	-- 0.2m -> 1
	-- 0.1m -> 0.5
	-- 0.0m -> 0
	local ratingDistToFieldBorder = math.min(1, Field.distanceToFieldBorder(ballPos) / 0.2)
	
	-- rates the distance to the target point
	-- 0.0m            -> 1
	-- 1.0m            -> 0.876
	-- FieldHeightHalf -> 0.5
	-- FieldHeight     -> 0
	local dist = ballPos:distanceTo(targetPoint)
	local ratingDistToTarget = math.max(0, 1 - dist / G.FieldHeight)

	-- rates the time the robot has to move
	local robotPos = self._robot.pos - 
		(targetPoint - ballPos):setLength(self._robot.shootRadius + World.Ball.radius)
	local robotTime = Physics.robotTimeToPos(self._robot, robotPos, Vector(0, 0), false)
	local ballTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(ballPos))
	local robotTimeRating = math.max(0, (robotTime * 0.8 - ballTime) * 0.5 + 0.5)

	-- return combination of the single ratings
	return ratingAngle * ratingTargetWidth * ratingDistToFieldBorder * 
		ratingDistToTarget * robotTimeRating
end

-- checks if the sampled ballPos is valid
function ShootGoal:_validateShootPos(ballPos)
	-- break if pos is outside the field
	if not Field.isInField(ballPos, self._robot.radius) then
		return false
	end

	-- break if pos is near our defense area
	if Field.isInFriendlyDefenseArea(ballPos, 0.5) then
		return false
	end

	-- break if the ball has already surpassed us
	local ballTime = Physics.checkedBallRollTime(World.Ball, ballPos)
	if ballTime < 0 then
		return false
	end

	-- break if the ball is too slow
	if Physics.ballAtTime(World.Ball, ballTime).speed:length() < 2 then
		return false
	end

	-- break if an opponent is near
	self:_updateRobotLists()
	for _,opp in ipairs(self._robotListWithoutKeeper) do
		if not opp.isFriendly and opp.pos:distanceTo(ballPos) < 0.3 then
			return false
		end	
	end

	return true
end

function ShootGoal:_volleyMinTime()
	-- cache it
	if self._volleyMinTimeTimestamp == World.Time then
		return
	end
	self._volleyMinTimeTimestamp = World.Time

	local rttb = Physics.robotTimeToBall(self._robot, World.Ball, G.OpponentGoal, 0)

	local timeBuffer = 0.1
	local timeBufferHeatupTime = 0.2

	if rttb > timeBufferHeatupTime then
		return rttb + timeBuffer
	else
		return rttb * (1 + timeBuffer / timeBufferHeatupTime)
	end
end

-- slightly updates the ballPos to counter out changes in the direction of the ball's speed
-- requires that the ball moves with a significant speed
function ShootGoal:_remapBallPosition(ballPos)
	return ballPos:nearestPosOnLine(World.Ball.pos - World.Ball.speed * 100,
		World.Ball.pos + World.Ball.speed * 100)
end

-- searches for a good position on the ball line to shoot the ball into the goal
function ShootGoal:_searchFirstVolleyShootPos()
	local sampleTimeInterval = 1
	local sampleCount = 10

	local minTime = self:_volleyMinTime()
	local maxTime = minTime + sampleTimeInterval
	local minPos = Physics.ballAtTime(World.Ball, minTime).pos
	local maxPos = Physics.ballAtTime(World.Ball, maxTime).pos

	local bestPos = nil
	local bestTarget = nil
	local bestRating = 0

	local posStep = (maxPos - minPos) / (sampleCount - 1)
	for i = 1, sampleCount do
		local pos = minPos + posStep * (i - 1)

		-- stop the iteration loop if pos is invalid
		if not self:_validateShootPos(pos) then
			break
		end

		-- update the target
		local targetPos, targetWidth = self:_findTarget(pos, false)

		-- search the best one
		if targetPos then
			local rating = self:_rateShootPos(pos, targetPos, targetWidth)
			if rating > bestRating then
				bestPos = pos
				bestTarget = targetPos
				bestRating = rating
			end
		end
	end

	return bestPos, bestTarget, bestRating
end

-- samples some volley shoot positions around the given oldPos
function ShootGoal:_searchNearbyVolleyShootPos(oldPos)
	local sampleVariance = 0.05
	local sampleCount = 5

	local ballDirection = World.Ball.speed:copy():normalize()

	local bestPos = nil
	local bestTarget = nil
	local bestRating = 0

	-- lower bound of the shoot pos search
	local minTime = self:_volleyMinTime()

	for i = 1, sampleCount do
		local rand = Random.standardNormalDistributedNumber() * sampleVariance
		local pos = oldPos + ballDirection * rand

		-- only consider valid points
		if self:_validateShootPos(pos) and Physics.checkedBallRollTime(World.Ball, pos) > minTime then

			-- update the target
			local targetPos, targetWidth = self:_findTarget(pos, false)

			-- search the best one
			local rating = self:_rateShootPos(pos, targetPos, targetWidth)
			if rating > bestRating then
				bestPos = pos
				bestTarget = targetPos
				bestRating = rating
			end
		end
	end

	return bestPos, bestTarget, bestRating
end

-- calculates the shoot position and target for volley shots
function ShootGoal:_updateVolleyShootPos()
	-- cache it
	if self._updateVolleyShootPosTimestamp == World.Time then
		return
	end
	self._updateVolleyShootPosTimestamp = World.Time

	local pos = self._volleyShootPos
	local target = self._volleyTargetPoint


	local oldPos = nil
	local oldPosValid = false
	if pos then
		oldPos = self:_remapBallPosition(pos)
		oldPosValid = self:_validateShootPos(oldPos)

		-- if the ball is about to arrive and the old position is still valid, don't update the position
		if oldPosValid then
			local ballRollDist = World.Ball.pos:distanceTo(oldPos)
			if Physics.ballRollTime(World.Ball, ballRollDist) < 1.0 then
				self._volleyShootPos = oldPos
				debug.set("volley status", "locked")
				return
			end
		end
	end
	
	-- if no valid previous volley pos was found or the ball is still being shot
	if not oldPos or Ball.isAccelerating() or not oldPosValid then
		pos, target = self:_searchFirstVolleyShootPos()

		self._volleyShootPos = pos
		self._volleyTargetPoint = target

		debug.set("volley status", "restart")
		return
	end

	-- update rating and target of the previous result
	local oldTarget, oldTargetWidth = self:_findTarget(oldPos, false)
	local oldRating = 0
	if oldTarget then
		oldRating = self:_rateShootPos(oldPos, oldTarget, oldTargetWidth)
	end

	-- search for better ones in the neighborhood of the old one
	local newPos, newTarget, newRating = self:_searchNearbyVolleyShootPos(oldPos)
	if newPos and newRating > oldRating then
		pos = newPos
		target = newTarget
		debug.set("volley status", "improve")
	else
		pos = oldPos
		target = oldTarget
		debug.set("volley status", "keep")
	end

	self._volleyShootPos = pos
	self._volleyTargetPoint = target
end



-- ====================================
-- ===== SHOOT TARGET CALCULATION =====
-- ====================================

-- updates self._robotList and self._robotListWithoutKeeper
-- all robot positions are extrapolated depending on the distance to self._robot
function ShootGoal:_updateRobotLists()
	-- cache it
	if self._robotListTimestamp == World.Time then
		return
	end
	self._robotListTimestamp = World.Time

	-- constant extrapolation time
	-- after this reaction time the robots tend to block the shot
	-- thus further extrapolation does not really make sense
	local extrapolationTime = 0.2

	-- clear the lists
	self._robotList = {}
	self._robotListWithoutKeeper = {}

	-- consider all robots (also our ones)
	for _,r in ipairs(World.Robots) do
		if r ~= self._robot then
			local futureRobot = { ["pos"] = r.pos + r.speed * extrapolationTime, 
				["radius"] = r.radius, ["speed"] = r.speed, ["isFriendly"] = r.isFriendly }

			table.insert(self._robotList, futureRobot)
			if r ~= World.OpponentKeeper then
				table.insert(self._robotListWithoutKeeper, futureRobot)
			end
		end
	end
end

function ShootGoal:_rateSector(sector, oldSectorMid)
	local sectorWidth = sector[2] - sector[1]

	local hysteresisFactor = 1
	if oldSectorMid and oldSectorMid > sector[1] and oldSectorMid < sector[2] then
		hysteresisFactor = 3
	end

	return sectorWidth * hysteresisFactor
end

function ShootGoal:_findTarget(viewPos, ignoreGoalie, oldTarget)
	local goalStart = (G.OpponentGoalRight - viewPos):angle()
	local goalEnd = (G.OpponentGoalLeft - viewPos):angle()

	-- get all free sectors
	self:_updateRobotLists()
	local robotList = ignoreGoalie and self._robotListWithoutKeeper or self._robotList
	local freeSectors = Goal.getFreeSectors(viewPos, robotList, goalStart, goalEnd)

	-- ricochets
	if ignoreGoalie and World.OpponentKeeper then
		--TODO
	end

	-- compute angle of old target (used for hysteresis)
	local oldSectorMid = nil
	if oldTarget then
		oldSectorMid = (oldTarget - viewPos):angle()
	end

	-- find best sector
	local bestRating = 0
	local bestSectorMid = nil
	local bestSectorWidth = 0
	for _,sector in ipairs(freeSectors) do
		local rating = self:_rateSector(sector, oldSectorMid)
		if rating > bestRating then
			bestRating = rating
			bestSectorMid = (sector[1] + sector[2]) * 0.5
			bestSectorWidth = sector[2] - sector[1]
		end
	end

	-- calculate target point
	-- default to shooting at the goal center
	local targetPoint = G.OpponentGoal
	if bestSectorMid then
		local intersection = geom.intersectLineLine(viewPos,
			Vector.fromAngle(bestSectorMid), G.OpponentGoal, Vector(1, 0))
		if intersection then
			targetPoint = intersection
		end
	end

	return targetPoint, bestSectorWidth
end

function ShootGoal:_updateTarget()
	if self._updateTargetTimestamp == World.Time then
		return
	end
	self._updateTargetTimestamp = World.Time

	-- compute viewPos relative to the current robot pos
	local viewPos = self._robot.pos + Vector.fromAngle(self._robot.dir) *
		(self._robot.shootRadius + World.Ball.radius)

	-- search a good target
	local targetPoint, targetWidth = self:_findTarget(viewPos, false, self._shootTargetPoint)

	-- update decision if we ignore the goalie and check for ricochets
	local dirtyCheckAngle = 1.2 * math.pi/180
	local dirtyCheckAngleHysteresis = 0.3 * math.pi/180
	self._dirty = targetWidth < dirtyCheckAngle - dirtyCheckAngleHysteresis or
		(self._dirty and targetWidth < dirtyCheckAngle + dirtyCheckAngleHysteresis)

	-- search a second time if necessary
	if self._dirty then
		targetPoint, targetWidth = self:_findTarget(viewPos, true, self._shootTargetPoint)
	end

	self._shootTargetPoint = targetPoint
	self._shootTargetWidth = targetWidth
end


--[[	if ignoreGoalie and World.OpponentKeeper then
		local interval, min, max = self:checkForRicochet()
		if interval[1] < -math.pi/2 then interval[1] = interval[1] + 2*math.pi end
		if interval[2] < -math.pi/2 then interval[2] = interval[2] + 2*math.pi end
		if min < -math.pi/2 then min = min + 2*math.pi end
		if max < -math.pi/2 then max = max + 2*math.pi end
		--log(min .. "  bis  " .. max .. " ==== (" .. interval[1] .. " | " .. interval[2] .. ")")
		local negated = {interval}
		freeSectors = Interval.negate(negated, min, max)
		self._viscolor = vis.colors.red
		Interval.merge(freeSectors)
		for _,i in pairs(freeSectors) do
			--log("sector  "..i[1].." :: "..i[2])
		end ]]

-- calculates the interval on the opponent keeper NOT suited for lucky rebounds into the goal
function ShootGoal:checkForRicochet(viewPos)
	viewPos = viewPos or World.Ball.pos

	local keeper = World.OpponentKeeper
	local toleft = G.OpponentGoalLeft - keeper.pos
	local toright = G.OpponentGoalRight - keeper.pos
	local toball = viewPos - keeper.pos

	local anglediffleft = toleft:absoluteAngleDiff(toball)
	local anglediffright = toright:absoluteAngleDiff(toball)

	local keeperRadiusAngle = math.asin(math.min(1, keeper.radius/toball:length()))


	local tokeeper = (-toball):angle()
	if anglediffleft < anglediffright then
		local reflectionangle = toball:angle() - anglediffleft/2
		local reflectionpoint = keeper.pos + Vector.fromAngle(reflectionangle) * keeper.radius
		local goalpost = G.OpponentGoalLeft +
			Vector.fromAngle((G.OpponentGoalLeft-viewPos):angle() - math.pi/2):setLength(World.Ball.radius)
		local toreflectionpoint = (reflectionpoint - viewPos):angle()
		--log("kl = " .. tokeeper - keeperRadiusAngle .. "   kr = " .. tokeeper + keeperRadiusAngle)
		--log("refl = " .. toreflectionpoint .. "   goal = " .. (goalpost - viewPos):angle())
		return {tokeeper - keeperRadiusAngle, toreflectionpoint},
			tokeeper - keeperRadiusAngle,
			math.min(tokeeper + keeperRadiusAngle, (goalpost - viewPos):angle())
	else
		local reflectionangle = toball:angle() + anglediffright/2
		local reflectionpoint = keeper.pos + Vector.fromAngle(reflectionangle) * keeper.radius
		local goalpost = G.OpponentGoalRight +
			Vector.fromAngle((G.OpponentGoalRight-viewPos):angle() + math.pi/2):setLength(World.Ball.radius)
		local togoalpost = (goalpost - viewPos):angle()
		local toreflectionpoint = (reflectionpoint - viewPos):angle()
		if togoalpost < math.pi/2 then togoalpost = togoalpost + 2*math.pi end
		if tokeeper < math.pi/2 then tokeeper = tokeeper + 2*math.pi end
		--log("bla = " .. togoalpost .. "  " ..toreflectionpoint - keeperRadiusAngle)
		return {toreflectionpoint, tokeeper + keeperRadiusAngle},
			math.max(tokeeper - keeperRadiusAngle, togoalpost),
			tokeeper + keeperRadiusAngle
	end
end

function ShootGoal:getDecisionMakingBasis()
	self:_updateTarget()
	return self._shootTargetPoint, self._shootTargetWidth, not self._dirty
end

function ShootGoal:_drawDebugInfo()
	debug.set("volley possible", self._volleyShootPos and true or false)

	local target = nil
	local color = nil
	local mode = nil
	if self._volleyShootPos then
		mode = "volley"
		target = self._volleyTargetPoint
		color = vis.colors.greenHalf
	elseif self._desperate then
		mode = "desperate"
		target = self._desperateChipTargetPoint
		color = vis.colors.redHalf
	else
		target = self._shootTargetPoint
		if self._dirty then
			mode = "dirty"
			color = vis.colors.orangeHalf
		else
			mode = "clean"
			color = vis.colors.yellowHalf
		end
	end

	debug.set("mode", mode)
	vis.addCircle("t/shootgoal: target", target, 0.05, color, true)

	if self._volleyShootPos then
		vis.addCircle("t/shootgoal: volley", self._volleyShootPos, 0.05, color, true)
		vis.addPath("t/shootgoal: volley", {self._volleyShootPos, target}, color)
	end
end

function ShootGoal:_init()
	self._robotList = {}
	self._robotListWithoutKeeper = {}

	self._robotListTimestamp = 0
	self._updateTargetTimestamp = 0
	self._updateVolleyShootPosTimestamp = 0
	self._volleyMinTimeTimestamp = 0

	self._shootTargetPoint = nil
	self._shootTargetWidth = 0
	self._dirty = false
	self._desperate = false
	self._desperateChipTargetPoint = G.OpponentGoal + Vector(0, -0.12)

	self._volleyTargetPoint = nil
	self._volleyShootPos = nil
end

function ShootGoal:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)

	-- check if a volley is a viable option
	self:_updateVolleyShootPos()

	if self._volleyShootPos then
		-- perform a volley
		self:_volley(self._volleyShootPos, self._volleyTargetPoint, math.huge)
		self._send.attackPosition("all", self._volleyTargetPoint)
	else
		self:_updateTarget()

		self._desperate = self._shootTargetWidth < 0.5 * math.pi / 180
		if not self._desperate then
			-- perform a linear shot
			self:_shoot(self._shootTargetPoint, math.huge, true,
				math.min(10 * math.pi / 180, self._shootTargetWidth or math.huge))
		else
			-- perform a chip shot
			self:_shoot(self._desperateChipTargetPoint,
				self._desperateChipTargetPoint:distanceTo(World.Ball.pos), false, 5 * math.pi / 180)
		end
	end

	self:_drawDebugInfo()
end

return ShootGoal