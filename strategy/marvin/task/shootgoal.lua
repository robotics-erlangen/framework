local ShootGoal = (require "../base/class").new("Task.ShootGoal", require "task/volley")

local Goal = require "observer/goal"
local Shoot = require "observer/shoot"

local Volley = require "task/volley"

local World = require "../base/world"
local G = World.Geometry
local geom = require "../base/geom"
local vis = require "../base/vis"


ShootGoal.priority = 5

-- how much to move the shoot pos towards the corner
-- (0 = mid of sector, 1 = straight towards the corner) 
local cornerWeight = 0.4

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
	self.targetPoint = bestMid and geom.intersectLineLine(viewPos, Vector.fromAngle(bestMid), 
			G.OpponentGoal, Vector.create(1, 0)) or G.OpponentGoal
	self.maxAngleError = bestAngleError
	
	self.timestamp = World.Time
	return #freeSectors
end

function ShootGoal:_init()
	self._bestMid = G.OpponentGoal
	Volley._init(self)
end

function ShootGoal:canShoot()
	self:updateDestination()
	return self.maxAngleError and self.maxAngleError > Settings.minAnglePrecision/180*math.pi
end

function ShootGoal:_canShoot()
	self:updateDestination()
	local angleDiff = math.abs(geom.getAngleDiff((self.targetPoint - World.Ball.pos):angle(), self._robot.dir))
	if self.maxAngleError then
		return angleDiff < self.maxAngleError or angleDiff < Settings.minAnglePrecision
	else
		return angleDiff < 5 / 180 * math.pi or angleDiff < Settings.minAnglePrecision
	end
end

function ShootGoal:run()
	self:updateDestination()
	if not self.bestMid then
		self:updateDestination(true)
	end
	-- shoot
	vis.addPath("ShootGoalTarget",{World.Ball.pos, self.targetPoint})

	-- TODO discuss if the layer above (a/a/shoot) should choose between volley and shoot instead
	if World.Ball.speed:length() > Settings.slowBall then
		self:_volley(self.targetPoint, math.huge)
	else
		self:_shoot(self.targetPoint, math.huge, true)
	end
end

return ShootGoal
