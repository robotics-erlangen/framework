local ShootGoal = (require "../base/class").new("Task.ShootGoal", require "task/volley")

local Goal = require "observer/goal"
local Shoot = require "observer/shoot"

local Volley = require "task/volley"

local World = require "../base/world"
local G = World.Geometry
local Interval = require "util/interval"
local geom = require "../base/geom"
local vis = require "../base/vis"


ShootGoal.priority = 5

-- how much to move the shoot pos towards the corner
-- (0 = mid of sector, 1 = straight towards the corner) 
local cornerWeight = 0

-- how much a new best sector should be better than the old one
local sectorRatingHysteresis = 2

local function robotList(selfRobot, viewPos, ignoreGoalie)
	local robots = {}
	for _,r in pairs(World.Robots) do
		if r.pos.y > viewPos.y and r ~= selfRobot then
			if not (ignoreGoalie and r == World.OpponentKeeper) then
				table.insert(robots, r)
			end
		end
	end
	return robots
end

-- updates at most once per frame:
-- self.bestIndex number - which index in self.freeSectors is the best one, if any
-- self.bestMid number - the angle towards the best point in the goal (from ball pos)
-- self.targetPoint - the best point in the goal
function ShootGoal:updateDestination(ignoreGoalie)
	if self.timestamp == World.Time and not ignoreGoalie then
		return
	end

	local viewPos = self._viewPos or World.Ball.pos
	
	local goalStart = (World.Geometry.OpponentGoalRight - viewPos):angle() -- direction of the first goalpost
	local goalEnd = (World.Geometry.OpponentGoalLeft - viewPos):angle() -- direction of the other goalpost

	local freeSectors = Goal.getFreeSectors(viewPos, robotList(self._robot, viewPos, ignoreGoalie), goalStart, goalEnd)

	local bestRating = -math.huge
	local bestMid = nil
	local bestAngleError = nil

	if ignoreGoalie and World.OpponentKeeper then
		local negated = Interval.negate(freeSectors, goalStart, goalEnd)
		local interval, min, max = self:checkForRicochet()
		if max < -math.pi/2 then max = max + 2*math.pi end
		if interval[1] < -math.pi/2 then interval[1] = interval[1] + 2*math.pi end
		if interval[2] < -math.pi/2 then interval[2] = interval[2] + 2*math.pi end
		table.insert(negated, interval)
		Interval.merge(negated)
		freeSectors = Interval.negate(negated, min, max)
		self._viscolor = vis.colors.red
		Interval.merge(freeSectors)
		for _,i in pairs({interval}) do
			log("sector  "..i[1].." :: "..i[2])
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
			bestAngleError = math.min(math.abs(geom.getAngleDiff(sector[1], sectorMid)),
					math.abs(geom.getAngleDiff(sector[2], sectorMid))) * 0.8 -- MAGIC CONSTANT
		end	
	end
	
	self.bestMid = bestMid
	self.targetPoint = bestMid and Vector.fromAngle(bestMid)*10 + viewPos or G.OpponentGoal
	self.maxAngleError = bestAngleError

	log("MAA "..tostring(ignoreGoalie).."  "..tostring(self.maxAngleError and self.maxAngleError/math.pi*180))
	
	self.timestamp = World.Time
	return #freeSectors
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
		vis.addPath("ShootGoalRicochet", {viewPos, reflectionpoint}, vis.colors.whiteHalf)
		vis.addPath("ShootGoalRicochet", {viewPos, goalpost}, vis.colors.whiteHalf)
		return {tokeeper - keeperRadiusAngle, toreflectionpoint}, 
			tokeeper - keeperRadiusAngle, (goalpost - viewPos):angle()
	else
		local reflectionangle = toball:angle() + anglediffright/2
		local reflectionpoint = keeper.pos + Vector.fromAngle(reflectionangle) * keeper.radius
		local goalpost = G.OpponentGoalRight + 
			Vector.fromAngle((G.OpponentGoalRight-viewPos):angle() + math.pi/2):setLength(World.Ball.radius)
		local toreflectionpoint = (reflectionpoint - viewPos):angle()
		vis.addPath("ShootGoalRicochet", {viewPos, reflectionpoint}, vis.colors.whiteHalf)
		vis.addPath("ShootGoalRicochet", {viewPos, goalpost}, vis.colors.whiteHalf)
		return {toreflectionpoint, tokeeper + keeperRadiusAngle},
			(goalpost - viewPos):angle(), tokeeper + keeperRadiusAngle
	end
end

function ShootGoal:_init(minPrecision)
	self._bestMid = G.OpponentGoal
	Volley._init(self)
	self._minPrecision = minPrecision or 2.5 / 180 * math.pi
end

function ShootGoal:canShoot()
	self:updateDestination()
	return self.maxAngleError and self.maxAngleError > Settings.minAnglePrecision/180*math.pi or true
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

function ShootGoal:run()
	self:updateDestination()
	if not self.bestMid or self.maxAngleError < Settings.minAnglePrecision then
		self:updateDestination(true)
	end

	if not self.targetPoint then
		log("WARNING: no valid targetPoint for ShootGoal")
		self.targetPoint = G.OpponentGoal
	end

	-- shoot
	vis.addPath("ShootGoalTarget",{World.Ball.pos, self.targetPoint}, self._viscolor)

	-- TODO discuss if the layer above (a/a/shoot) should choose between volley and shoot instead
	
	self:_shoot(self.targetPoint, math.huge, true)
	
end

return ShootGoal
