local ShootGoal = (require "../base/class").new("Task.ShootGoal", require "task/shoot")

local Robot = require "observer/robot"
local Goal = require "observer/goal"
local Shoot = require "observer/shoot"

local World = require "../base/world"
local G = World.Geometry
local ball = World.Ball
local geom = require "../base/geom"
local vis = require "../base/vis"


ShootGoal.priority = 5

-- how much to move the shoot pos towards the corner
-- (0 = mid of sector, 1 = straight towards the corner) 
local cornerWeight = 0.4

-- how much a new best sector should be better than the old one
local sectorRatingHysteresis = 2

local function robotList(selfRobot, viewPos)
	local robots = {}
	for _,r in pairs(World.Robots) do
		if r.pos.y > viewPos.y and r ~= selfRobot then
			table.insert(robots, r)
		end
	end
	return robots
end

-- updates at most once per frame:
-- self.bestIndex number - which index in self.freeSectors is the best one, if any
-- self.bestMid number - the angle towards the best point in the goal (from ball pos)
-- self.targetPoint - the best point in the goal
function ShootGoal:updateDestination()
	if self.timestamp == World.Time then
		return
	end

	local goalStart = (World.Geometry.OpponentGoalRight - ball.pos):angle() -- direction of the first goalpost
	local goalEnd = (World.Geometry.OpponentGoalLeft - ball.pos):angle() -- direction of the other goalpost
		
	local viewPos = ball.pos --FIXME take future ball pos instead
	local freeSectors = Goal.getFreeSectors(viewPos, robotList(self._robot, viewPos), goalStart, goalEnd)

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
					math.abs(geom.getAngleDiff(sector[2], sectorMid))) * 0.8
		end	
	end
	
	self.bestMid = bestMid
	self.targetPoint = bestMid and geom.intersectLineLine(ball.pos, Vector.fromAngle(bestMid), 
			G.OpponentGoal, Vector.create(1, 0)) or G.OpponentGoal
	self.maxAngleError = bestAngleError
	
	self.timestamp = World.Time
end

function ShootGoal:_init()
	self._bestMid = G.OpponentGoal
end

function ShootGoal:_rate()
	return Robot.minTimeToBall(self._robot, World.Ball) 
end

function ShootGoal:canShoot()
	self:updateDestination()
	return self.maxAngleError and self.maxAngleError > 1.8/180*math.pi
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

function ShootGoal:_run()
	self:updateDestination()
	-- shoot
	self._robot:setDribblerSpeed(1)
	self:_shoot(self.targetPoint, math.huge, true)
end

function ShootGoal.factory(position)
	local f = function (robots)
		return ShootGoal.create(robots[position])
	end
	return f
end

function ShootGoal.test(id)
	if id > 0 then
		return nil
	end
	return ShootGoal.factory(1), 1
end

return ShootGoal
