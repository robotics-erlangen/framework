local Shoot = require "task/ability/shoot"

local ShootGoal = Class("Task.ShootGoal", require "task/base", Shoot)

local Goal = require "observer/goal"
local Shoot = require "observer/shoot"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"

local World = require "../base/world"
local Cache = require "../base/cache"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local G = World.Geometry

local Interval = require "util/interval"
local Random = require "util/random"
local Field = require "../base/field"


local MIN_REQUIRED_ANGLE = 1 / 180 * math.pi -- in order to shoot into a free sector
local MIN_REQUIRED_ANGLE_HYSTERESIS = 0.3 / 180 * math.pi
local MIN_SHOOT_PRECISION = 10 / 180 * math.pi -- for the shoot ability
-- how much to move the shoot pos towards the corner
-- (0 = mid of sector, 1 = straight towards the corner)
local CORNER_WEIGHT = 0

-- how much a new best sector should be better than the old one
local SECTOR_RATING_HYSTERESIS = 3

-- how large the angle for volley may be [rad]
local MAX_VOLLEY_ANGLE = 80 * math.pi / 180


local function robotList(selfRobot, viewPos, ignoreGoalie)
	local minExtrapolationTime = 0.2
	local maxExtrapolationTime = 0.8
	local distCap = math.bound(0.1, selfRobot.pos:distanceTo(
		G.OpponentGoal) - G.DefenseRadius - 3 * selfRobot.radius, 1)

	local robots = {}
	for _,r in pairs(World.Robots) do
		if r.pos.y > viewPos.y and r ~= selfRobot then
			if not (ignoreGoalie and r == World.OpponentKeeper) then
				local extrapolationTime = (1 - math.bound(0, r.pos:distanceTo(selfRobot.pos), distCap) / distCap) *
						(maxExtrapolationTime - minExtrapolationTime) + minExtrapolationTime
				local future_robot = {
					["pos"] = r.pos + r.speed * extrapolationTime,
					["radius"] = r.radius,
					["speed"] = r.speed,
				}
				vis.addCircle("t/shootgoal: robot extrapolation", future_robot.pos,
						future_robot.radius + 0.02, vis.colors.redHalf, true)
				table.insert(robots, future_robot)
			end
		end
	end
	return robots
end

local function rate(ballPos, targetPoint, dist, intervalLength, maxAngleError, distToOpp)
	-- rate volley angle
	local rotateAngle = World.Ball.speed:absoluteAngleDiff(ballPos - targetPoint)
	local rotateRating = 1 - rotateAngle/MAX_VOLLEY_ANGLE
	rotateRating = rotateRating * rotateRating

	-- rate free sector width
	local goalRating = maxAngleError

	-- rate distance to field border
	local fieldRating = math.min(Field.distanceToFieldBorder(ballPos) / 0.2, 1)

	-- rate extraTime added to minTimeToBall
	-- looks like a log(x)/x curve
	local peakTime = 0.3
	local shootX = (math.bound(0, dist / intervalLength, 1) + 1) * peakTime
	local extraTimeRating = -math.log(shootX)/shootX * math.exp(1)

	-- rate distance to goal
	local goalDistRating = 1 - ballPos:distanceTo(G.OpponentGoal) / G.FieldHeight

	-- distance to closest opponent
	local oppRating = math.bound(0, (distToOpp - 0.05)/(0.09+World.Ball.radius - 0.05), 1)

	local finalRating = rotateRating * goalRating * fieldRating * extraTimeRating * goalDistRating * oppRating
	return finalRating
end


function ShootGoal:guessFirstPassReceiptPosition()
	local sampleTimeInterval = 1
	local sampleCount = 10
	local sampleMinPosStep = 0.05
	local safetyTime = 0.4


	local minTime = Robot.minTimeToBall(self._robot) + safetyTime
	local maxTime = minTime + sampleTimeInterval
	local minPos = Physics.ballAtTime(World.Ball, minTime).pos
	local maxPos = Physics.ballAtTime(World.Ball, maxTime).pos

	local dangerousRobots = {}
	for _,r in ipairs(World.OpponentRobots) do
		if r.pos:distanceToLineSegment(minPos, maxPos) < World.Ball.radius + r.radius then
			table.insert(dangerousRobots, r)
		end
	end


	local allowedWidth = G.FieldWidthHalf - 2 * self._robot.radius
	local sign = minPos.x > 0 and 1 or -1
	if sign * minPos.x > allowedWidth then
		local shrinkWidth = sign * minPos.x - allowedWidth
		minPos.x = sign * allowedWidth
		minPos.y = minPos.y - sign * shrinkWidth *
				(minPos.y - World.Ball.pos.y) / (minPos.x - World.Ball.pos.x)
	end

	local intervalLength = minPos:distanceTo(maxPos)
	local intervalDir = (maxPos - minPos):normalize()
	local sampleStep = math.max(sampleMinPosStep, intervalLength/sampleCount)

	local sampleResults = {}

	for dist = 0, intervalLength, sampleStep do
		local ballPos = minPos + intervalDir * dist

		-- if there is at least one valid position
		if next(sampleResults) ~= nil then
			-- only consider catch positions inside the field
			if not Field.isInField(ballPos, -self._robot.radius) then break end
			if Field.distanceToFriendlyDefenseArea(ballPos, self._robot.radius) < 0.4 then break end
			-- don't sample into opponent robots
			local stop_sampling = false
			for _,r in ipairs(World.OpponentRobots) do
				local dx = r.pos.x - ballPos.x
				local dy = r.pos.y - ballPos.y
				local d = self._robot.radius * 2 + r.radius
				if dx * dx + dy * dy < d * d then
					stop_sampling = true
					break
				end
			end
			if stop_sampling then break end
		end

		self:_calculateDestination(ballPos, false)

		local distToOpp = math.huge
		for _,r in ipairs(dangerousRobots) do
			local d = r.pos:distanceToLineSegment(minPos, ballPos)
			if d < distToOpp then
				distToOpp = d
			end
		end

		local rating = rate(ballPos, self.targetPoint, dist, intervalLength, self.maxAngleError, distToOpp)
		table.insert(sampleResults, {["target"] = self.targetPoint,
									 ["view"] = ballPos,
									 ["rating"] = rating})
	end

	local best = nil
	for _,result in ipairs(sampleResults) do
		if not best or result.rating > best.rating then
			best = result
		end
	end


	vis.addCircle("t/shootgoal: passReceiptPosition", best.view, 0.1, vis.colors.magentaHalf, true)

	return best.target, best.view
end
ShootGoal.guessFirstPassReceiptPosition = Cache.forFrame(ShootGoal.guessFirstPassReceiptPosition)

function ShootGoal:improvePassReceiptPosition(ballPos, lastBallSpeed)
	-- if the ball still accelerates, recalculate the pass receipt position
	if World.Ball.speed:length() > lastBallSpeed:length() + 0.2 then
		local target, view = self:guessFirstPassReceiptPosition()
		return target, view, false
	end

	local sampleCount = 5
	local sampleVariance = 0.07

	local sampleResults = {}
	local dir = World.Ball.speed:copy():normalize()
	local lambda, intersection = math.huge, nil
	if dir.x ~= 0 then
		local sign = dir.x > 0 and 1 or -1
		local allowedWidth = G.FieldWidthHalf - 2 * self._robot.radius
		intersection,lambda = geom.intersectLineLine(World.Ball.pos, dir,
				Vector(sign * allowedWidth, 0), Vector(0, 1))
	end
	if not lambda then
		lambda = math.huge
	end

	ballPos = World.Ball.pos + dir * math.min(World.Ball.pos:distanceTo(ballPos), lambda)
	for i = 1,sampleCount do
		local dist = 0
		local pos = ballPos
		local continueFlag = false
		if i > 1 then
			local rand = Random.standardNormalDistributedNumber()
			dist = rand * sampleVariance
			pos = ballPos + dir * dist
			if Field.distanceToFriendlyDefenseArea(pos, self._robot.radius) < 0.4 then
				continueFlag = true
			end
		end

		if not continueFlag then
			local minPos = ballPos - dir * 2*sampleVariance
			local distToOpp = math.huge
			for _,r in ipairs(World.OpponentRobots) do
				local dist = r.pos:distanceToLineSegment(minPos, ballPos)
				if dist < distToOpp then
					distToOpp = dist
				end
			end

			self:_calculateDestination(pos, false)

			local rating = rate(pos, self.targetPoint, dist + sampleVariance, 2*sampleVariance, self.maxAngleError, distToOpp)
			table.insert(sampleResults, {["target"] = self.targetPoint,
										 ["view"] = ballPos,
										 ["rating"] = rating})
		end
	end

	local best = nil
	for _,result in ipairs(sampleResults) do
		if not best or result.rating > best.rating then
			best = result
		end
	end

	vis.addCircle("t/shootgoal: passReceiptPosition", best.view, 0.1, vis.colors.magentaHalf, true)

	return best.target, best.view, true
end

-- updates at most once per frame:
-- self.bestIndex number - which index in self.freeSectors is the best one, if any
-- self.bestMid number - the angle towards the best point in the goal (from ball pos)
-- self.targetPoint - the best point in the goal
function ShootGoal:updateDestination()
	local viewPos = self._robot.pos + Vector.fromAngle(self._robot.dir) *
			(self._robot.shootRadius + World.Ball.radius)


	-- calculate free sectors considering the opponent goalie
	self:_calculateDestination(viewPos, false)

	-- if there is no clean sector,
	-- 1. ignore the goalie
	-- 2. check for ricochet opportunities
	if not self.bestMid or 
			(self.sectorClean and self.maxAngleError < MIN_REQUIRED_ANGLE - MIN_REQUIRED_ANGLE_HYSTERESIS) or
			(not self.sectorClean and self.maxAngleError < MIN_REQUIRED_ANGLE + MIN_REQUIRED_ANGLE_HYSTERESIS) then
		self:_calculateDestination(viewPos, true)
		self.sectorClean = false
	else
		self.sectorClean = true
	end
end
ShootGoal.updateDestination = Cache.forFrame(ShootGoal.updateDestination)

function ShootGoal:_calculateDestination(viewPos, ignoreGoalie)
	local goalStart = (G.OpponentGoalRight - viewPos):angle() -- direction of the first goalpost
	local goalEnd = (G.OpponentGoalLeft - viewPos):angle() -- direction of the other goalpost

	local freeSectors = Goal.getFreeSectors(viewPos, robotList(self._robot, viewPos, ignoreGoalie), goalStart, goalEnd)

	local bestRating = -math.huge
	local bestMid = nil
	local bestAngleError = 0

	if ignoreGoalie and World.OpponentKeeper then
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
		end
	else
		self._viscolor = vis.colors.black
	end

	for _, sector in pairs(freeSectors) do
		-- calculate shoot angle (mid of sector, near corner if possible)
		local weight = 0.5
		if sector[1] == goalStart then
			weight = weight + CORNER_WEIGHT/2
		end
		if sector[2] == goalEnd then
			weight = weight - CORNER_WEIGHT/2
		end
		local sectorMid = weight*sector[1] + (1 - weight)*sector[2]

		-- calculate rating
		local rotateAngle = math.abs(geom.getAngleDiff(self._robot.dir, sectorMid))
		local sectorWidth = math.abs(geom.getAngleDiff(sector[1], sector[2]))
		local rating = (math.pi^2 - rotateAngle^2) * sectorWidth

		-- reevaluate the old sector
		-- (assuming the angles are between 0 and pi)
		if self.bestMid and self.bestMid > sector[1] and self.bestMid < sector[2] then
			rating = rating * (1 + SECTOR_RATING_HYSTERESIS)
		end

		-- search best sector
		if rating > bestRating then
			bestRating = rating
			bestMid = sectorMid
			bestAngleError = math.min(math.abs(geom.getAngleDiff(sector[1], sectorMid)),
					math.abs(geom.getAngleDiff(sector[2], sectorMid))) * 0.8 -- MAGIC CONSTANT
		end
	end

	self.bestMid = bestMid
	if not bestMid then
		self.targetPoint = G.OpponentGoal
	else
		local ipos = geom.intersectLineLine(viewPos, Vector.fromAngle(bestMid), G.OpponentGoal, Vector(1, 0))
		self.targetPoint = ipos or G.OpponentGoal
	end
	self.maxAngleError = bestAngleError

	if self.bestMid then
		vis.addPath("t/shootgoal: ShootGoalTarget", {viewPos, viewPos + Vector.fromAngle(bestMid + bestAngleError):scaleLength(20)},
			vis.colors.whiteHalf)
		vis.addPath("t/shootgoal: ShootGoalTarget", {viewPos, viewPos + Vector.fromAngle(bestMid - bestAngleError):scaleLength(20)},
			vis.colors.whiteHalf)
		vis.addPath("t/shootgoal: ShootGoalTarget",{viewPos, self.targetPoint}, self._viscolor)
	end
end

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
	self:updateDestination()
	return self.targetPoint, self.maxAngleError, self.sectorClean
end

function ShootGoal:_init()
	self._viewPosLockDistance = 0.5

	self._viscolor = nil
	self.bestMid = nil
	self.targetPoint = nil
	self.maxAngleError = nil
	self.sectorClean = nil
	self._PRPstable = false
	self._viewPos = nil
	self._viewPosLocked = false
	self._sglastBallSpeed = nil
	self._bestMid = G.OpponentGoal

	-- no volley if we don't have enough time to prepare
	if self._robot.pos:distanceTo(World.Ball.pos) < 0.5 then
		self._volleyPossible = false
		return
	end

	self._volleyPossible = Ball.receivesPass(self._robot)
end

function ShootGoal:run()
	self._robot.path:setDefaultObstacles(self._robot, true)
	if self._volleyPossible then

		-- calculate the best pass receipt position
		if not self._viewPos then
			self.targetPoint, self._viewPos = self:guessFirstPassReceiptPosition()
		elseif not self._viewPosLocked then
			self.targetPoint, self._viewPos, self._PRPstable =
					self:improvePassReceiptPosition(self._viewPos, self._sglastBallSpeed)
		else
			-- remap viewPos to actual ball trajectory
			self._viewPos = self._viewPos:nearestPosOnLine(World.Ball.pos - World.Ball.speed*100, World.Ball.pos + World.Ball.speed*100)
		end
		self._sglastBallSpeed = World.Ball.speed

		debug.set("type", "volley")
		self:_volley(self._viewPos, self.targetPoint, math.huge)

		-- lock pass receipt position if the ball is too close
		if World.Ball.pos:distanceTo(self._viewPos) < self._viewPosLockDistance then
			self._viewPosLocked = true
		end

		-- abort volley when one of the following conditions apply
		-- or the ball is slow and somewhat away from us
		if (World.Ball.speed:length() < 0.6 and World.Ball.pos:distanceTo(self._robot.pos) > 0.5)
		-- or the ball is extremely slow
		or World.Ball.speed:length() < 0.3
		-- or we cannot catch the ball inside the field
		or not Field.isInField(Physics.ballAtTime(World.Ball, Robot.minTimeToBall(self._robot)).pos, 0)
		-- ball is faster at catch position then robot
		or Physics.ballRollTime(World.Ball.pos:distanceTo(self.targetPoint)) < Robot.minTimeToBall(self._robot) - 0.1
		-- or the viewPos makes sense and the angle is too large
		or self._PRPstable and World.Ball.speed:absoluteAngleDiff(self._viewPos - self.targetPoint) > MAX_VOLLEY_ANGLE then
			self._volleyPossible = false
		end

		-- send the position where the ball changes its velocity
		self._send.attackPosition("all", self.targetPoint)
	else
		self:updateDestination()

		if self.bestMid and self.maxAngleError > 0.5 / 180 * math.pi then
			if self.sectorClean then
				debug.set("type", "shoot (clean)")
			else
				debug.set("type", "shoot (dirty)")
			end
			self:_shoot(self.targetPoint, math.huge, true,
				math.min(MIN_SHOOT_PRECISION, self.maxAngleError or math.huge))
		else
			local mae =  5 * math.pi/180
			local chipPos = G.OpponentGoal + (G.FriendlyGoal - G.OpponentGoal):setLength(0.1)

			debug.set("type", "desperate chip")
			self:_shoot(chipPos, chipPos:distanceTo(World.Ball.pos), false, mae)
		end
		-- t/a/catchball sends the attack position
	end
end

return ShootGoal
