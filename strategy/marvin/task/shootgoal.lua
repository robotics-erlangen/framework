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
local cornerWeight = 0.6

-- how much a new best sector should be better than the old one
local sectorRatingHysteresis = 1


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
-- self.freeSectors (number, number)[] - list of angle pairs
function ShootGoal:updateFreeSectors()
	if self.timestamp ~= World.Time then
		local goalStart = (World.Geometry.OpponentGoalRight - ball.pos):angle() -- direction of the first goalpost
		local goalEnd = (World.Geometry.OpponentGoalLeft - ball.pos):angle() -- direction of the other goalpost
		local viewPos = ball.pos --FIXME take future ball pos instead
		self.freeSectors = Goal.getFreeSectors(viewPos, robotList(self._robot, viewPos), goalStart, goalEnd)
		self.timestamp = World.Time
	end
end

-- updates at most once per frame:
-- self.bestIndex number - which index in self.freeSectors is the best one, if any
-- self.bestMid number - the angle towards the best point in the goal (from ball pos)
-- self.targetPoint - the best point in the goal
function ShootGoal:updateDestination()
	if self.timestamp2 == World.Time then
		return
	end
	
	local goalStart = (World.Geometry.OpponentGoalRight - ball.pos):angle() -- direction of the first goalpost
	local goalEnd = (World.Geometry.OpponentGoalLeft - ball.pos):angle() -- direction of the other goalpost
		
	local oldBestRating = 0
	local oldBestMid = nil
	
	local bestRating = 0
	local bestIndex = 0
	local bestMid = nil
	
	for index,sector in pairs(self.freeSectors) do
		
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
		local sectorWidth = sector[2] - sector[1]
		local rating = (math.pi^2 - rotateAngle^2) * sectorWidth
		
		-- reevaluate the old sector
		-- (assuming the angles are between 0 and pi)
		if oldBestMid and oldBestMid > sector[1] and oldBestMid < sector[2] then
			oldBestRating = rating
			oldBestMid = sectorMid
		end
		
		-- search best sector
		if rating > bestRating then
			bestRating = rating
			bestIndex = index
			bestMid = sectorMid
		end	
	end
	
	-- decide if changing to the new best sector is needed
	if oldBestRating == 0 or bestRating > oldBestRating + sectorRatingHysteresis then
		self.bestIndex = bestIndex
		self.bestMid = bestMid
	end
	
	
	self.targetPoint = self.bestMid and geom.intersectLineLine(ball.pos, Vector.fromAngle(self.bestMid), 
			G.OpponentGoal, Vector.create(1, 0)) or self.targetPoint or G.OpponentGoal
	
	self.timestamp2 = World.Time
end

function ShootGoal:_init(dontMove)
	self._dontMove = dontMove
	self._bestMid = G.OpponentGoal
	self._bestIndex = 0
end

function ShootGoal:_rate()
	return Robot.minTimeToBall(self._robot, World.Ball) 
end

function ShootGoal:canShoot()	
	self:updateFreeSectors()
	return #self.freeSectors > 0
end

function ShootGoal:_successProbability(time)
	self:updateFreeSectors()
	self:updateDestination()
	return Shoot.evaluateShootCorridor(self.targetPoint, self._robot.maxShotLinear, ball.pos, time, World.OpponentRobots) 
end

function ShootGoal:_run()
	self:updateFreeSectors()
	self:updateDestination()
	
	-- shoot
	self._robot:setDribblerSpeed(0)
	self:_shoot(self.targetPoint, math.huge, true, 0, self.dontMove)
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
