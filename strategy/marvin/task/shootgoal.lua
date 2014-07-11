-- load abilities
local CatchBall = require "task/ability/catchball"
local ReceivePass = require "task/ability/receivepass"
local Volley = require "task/ability/volley"
local Shoot = require "task/ability/shoot"

local ShootGoal = (require "../base/class").newTask("Task.ShootGoal", require "task/base",
		CatchBall, ReceivePass, Volley, Shoot)

local Goal = require "observer/goal"
local Shoot = require "observer/shoot"
local Robot = require "observer/robot"
local Ball = require "observer/ball"

local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local debug = require "../base/debug"
local G = World.Geometry

local Interval = require "util/interval"
local Random = require "util/random"
local Field = require "util/field"



-- how much to move the shoot pos towards the corner
-- (0 = mid of sector, 1 = straight towards the corner)
local cornerWeight = 0

-- how much a new best sector should be better than the old one
local sectorRatingHysteresis = 2

-- the time the opponent robot positions are extrapolated
local extrapolationTime = 0.2

local function robotList(selfRobot, viewPos, ignoreGoalie)
	local robots = {}
	for _,r in pairs(World.Robots) do
		if r.pos.y > viewPos.y and r ~= selfRobot then
			if not (ignoreGoalie and r == World.OpponentKeeper) then
				local future_robot = {
					["pos"] = r.pos + r.speed * extrapolationTime,
					["radius"] = r.radius,
					["speed"] = r.speed,
				}
				table.insert(robots, future_robot)
			end
		end
	end
	return robots
end

local function rate(ballPos, targetPoint, dist, intervalLength, maxAngleError)
	local ratingVolleyMaxAngle = 90 /180*math.pi

	local rotateAngle = World.Ball.speed:absoluteAngleDiff(ballPos - targetPoint)
	local rotateRating = 1 - rotateAngle/ratingVolleyMaxAngle
	rotateRating = rotateRating * rotateRating

	local distRating = 1 - dist/intervalLength
	distRating = distRating * distRating

	local goalRating = maxAngleError

	--log(math.floor(rotateRating * 100) .. "   " .. math.floor(goalRating * 100))

	-- ignore distance rating for now...
	local finalRating = rotateRating * goalRating --* distRating
	return finalRating
end

function ShootGoal:getTimeBuffer()
	local minTime = 0.0
	local maxTime = 0.3
	local minRampDist = 0.2
	local maxRampDist = 0.5

	local dist = self._robot.pos:distanceTo(World.Ball.pos)
	dist = math.min(math.max(minRampDist, dist), maxRampDist)

	local t = (dist - minRampDist) / (maxRampDist - minRampDist)
	return minTime + t * (maxTime - minTime)
end

function ShootGoal:guessFirstPassReceiptPosition()
	local sampleTimeInterval = 1
	local sampleCount = 10
	local sampleMinPosStep = 0.05
	local timeBuffer = self:getTimeBuffer()



	local minTime = Robot.minTimeToBall(self._robot, World.Ball) + timeBuffer
	local maxTime = minTime + sampleTimeInterval
	local minPos = Ball.atTime(minTime, World.Ball).pos
	local maxPos = Ball.atTime(maxTime, World.Ball).pos

	local allowedWidth = World.Geometry.FieldWidthHalf - 2 * self._robot.radius
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

		local rating = rate(ballPos, self.targetPoint, dist, intervalLength, self.maxAngleError)
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

function ShootGoal:improvePassReceiptPosition(ballPos)
	-- if the ball still accelerates, recalculate the pass receipt position
	local minTime = Robot.minTimeToBall(self._robot, World.Ball)
	local minPos = Ball.atTime(minTime, World.Ball).pos
	if self._robot.pos:distanceTo(ballPos) > self._robot.pos:distanceTo(minPos) then
		return self:guessFirstPassReceiptPosition()
	end


	local sampleCount = 5
	local sampleVariance = 0.03

	local sampleResults = {}
	local dir = World.Ball.speed:copy():normalize()
	local lambda, intersection = math.huge, nil
	if dir.x ~= 0 then
		local sign = dir.x > 0 and 1 or -1
		local allowedWidth = World.Geometry.FieldWidthHalf - 2 * self._robot.radius
		intersection,lambda = geom.intersectLineLine(World.Ball.pos, dir,
				Vector.create(sign * allowedWidth, 0), Vector.create(0, 1))
	end
	ballPos = World.Ball.pos + dir * math.min(World.Ball.pos:distanceTo(ballPos), lambda)
	for i = 1,sampleCount do
		local pos = ballPos
		if i > 1 then
			local rand = Random.standardNormalDistributedNumber()
			pos = ballPos + dir * rand * sampleVariance
		end

		self:_calculateDestination(pos, false)

		local rating = rate(pos, self.targetPoint, 0, 1, self.maxAngleError)
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

-- updates at most once per frame:
-- self.bestIndex number - which index in self.freeSectors is the best one, if any
-- self.bestMid number - the angle towards the best point in the goal (from ball pos)
-- self.targetPoint - the best point in the goal
function ShootGoal:updateDestination()
	if self._timestamp == World.Time then
		return
	end
	self._timestamp = World.Time



	local viewPos = World.Ball.pos

	-- calculate free sectors considering the opponent goalie
	self:_calculateDestination(viewPos, false)
	self.sectorClean = true

	-- if there is no clean sector,
	-- 1. ignore the goalie
	-- 2. check for ricochet opportunities
	if not self.bestMid or self.maxAngleError < Settings.minAnglePrecision then
		self:_calculateDestination(viewPos, true)
		self.sectorClean = false
	end
end

function ShootGoal:_calculateDestination(viewPos, ignoreGoalie)
	-- anti-lifelock timeout
	if World.Time - self._starttime > self._timeout then
		self.targetPoint = self.targetPoint or World.Geometry.OpponentGoal
		self.bestMid = self.bestMid or math.pi/2
		self.maxAngleError = self.maxAngleError or math.huge
		return
	end
		

	local goalStart = (World.Geometry.OpponentGoalRight - viewPos):angle() -- direction of the first goalpost
	local goalEnd = (World.Geometry.OpponentGoalLeft - viewPos):angle() -- direction of the other goalpost

	local freeSectors = Goal.getFreeSectors(viewPos, robotList(self._robot, viewPos, ignoreGoalie), goalStart, goalEnd)

	local bestRating = -math.huge
	local bestMid = nil
	local bestWidth = 0
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
			weight = weight + cornerWeight/2
		end
		if sector[2] == goalEnd then
			weight = weight - cornerWeight/2
		end
		local sectorMid = weight*sector[1] + (1 - weight)*sector[2]

		-- calculate rating
		local rotateAngle = math.abs(geom.getAngleDiff(self._robot.dir, sectorMid))
		local sectorWidth = math.abs(geom.getAngleDiff(sector[1], sector[2]))
		local rating = (math.pi^2 - rotateAngle^2) * sectorWidth

		-- reevaluate the old sector
		-- (assuming the angles are between 0 and pi)
		if self.bestMid and self.bestMid > sector[1] and self.bestMid < sector[2] then
			rating = rating * (1 + sectorRatingHysteresis)
		end

		-- search best sector
		if rating > bestRating then
			bestRating = rating
			bestMid = sectorMid
			bestWidth = sectorWidth
			bestAngleError = math.min(math.abs(geom.getAngleDiff(sector[1], sectorMid)),
					math.abs(geom.getAngleDiff(sector[2], sectorMid))) * 0.8 -- MAGIC CONSTANT
		end
	end

	self.bestMid = bestMid
	self.targetPoint = bestMid and Vector.fromAngle(bestMid)*10 + viewPos or G.OpponentGoal
	self.maxAngleError = bestAngleError

	if self.bestMid then
		vis.addPath("t/shootgoal: ShootGoalTarget", {viewPos, Vector.fromAngle(bestMid + bestWidth/2) * 20 + viewPos},
			vis.colors.whiteHalf)
		vis.addPath("t/shootgoal: ShootGoalTarget", {viewPos, Vector.fromAngle(bestMid - bestWidth/2) * 20 + viewPos},
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

function ShootGoal:_canShoot()
	self:updateDestination()
	local angleDiff = math.abs(geom.getAngleDiff((self.targetPoint - World.Ball.pos):angle(), self._robot.dir))

	if angleDiff < Settings.minAnglePrecision then
		-- always shoot if the direction is precise enough
		return true
	else
		-- otherwise check the free goal angle
		return angleDiff < math.min(self._minPrecision, self.maxAngleError or math.huge)
	end
end



function ShootGoal:_init(minPrecision, receivepassHint)
	self._minPrecision = minPrecision or 2.5 / 180 * math.pi
	self._viewPosLockDistance = 0.05

	self._viscolor = nil
	self.bestMid = nil
	self.targetPoint = nil
	self.maxAngleError = nil
	self.sectorClean = nil
	self._viewPos = nil
	self._viewPosLocked = false
	self._bestMid = G.OpponentGoal
	self._timestamp = 0
	self._starttime = World.Time
	self._timeout = math.random() * 3 + 3

	-- because of the 1 frame delay this agent still gets the last message of the previous mainAttacker
	self._receivePass = receivepassHint or false
	for _,_ in pairs(self._inbox.passSender()) do
		self._receivePass = true
		return
	end

	self._receivePass = Ball.receivesPass(self._robot)
end

function ShootGoal:run()
	if self._receivePass then

		-- calculate the best pass receipt position
		if not self._viewPos then
			self.targetPoint, self._viewPos = self:guessFirstPassReceiptPosition()
		end
		if not self._viewPosLocked then
			self.targetPoint, self._viewPos = self:improvePassReceiptPosition(self._viewPos)
		end
		if World.Ball.pos:distanceTo(self._viewPos) < self._viewPosLockDistance then
			self._viewPosLocked = true
		end

		-- TODO: if angle is too large, catchBall + shoot instead of volley
		debug.set("type", "volley")
		self:_volley(self._viewPos, self.targetPoint, math.huge)


		-- reconsider catching the ball if the pass gets messed up
		if (World.Ball.speed:length() < 0.5 and World.Ball.pos:distanceTo(self._robot.pos) > 0.5)
		or World.Ball.speed:length() < 0.2
		or not Field.isInField(Ball.atTime(Robot.minTimeToBall(self._robot, World.Ball)).pos, 0) then
			self._receivePass = false
		end

		-- send the position where the ball changes its velocity
		self._send.attackPosition("all", self.targetPoint)
	else
		self:updateDestination()

		if self.bestMid then
			if self.sectorClean then
				debug.set("type", "shoot (clean)")
			else
				debug.set("type", "shoot (dirty)")
			end
			self:_shoot(self.targetPoint, math.huge, true)
		else
			local somewhereNearTheGoal = World.Geometry.OpponentGoal + Vector.create(0, -0.3)
			debug.set("type", "chip")
			self:_shoot(somewhereNearTheGoal, math.huge, false)
		end

		if self.maxAngleError then
			debug.set("maxAngleError (deg)", self.maxAngleError * 180 / math.pi)
		end

		-- t/a/catchball sends the attack position
	end
end

return ShootGoal
