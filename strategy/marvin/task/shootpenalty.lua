--=====================--
-- Tournament Settings --
--=====================--
local distToPost = 0.05 -- distance of the target point on goal line to the post
local changeThreshold = 0.5 -- set 0 if opponent keeper follows look Dir every time
local fixedCorner = false -- set to "Right" or "Left" if opponent keeper has fixed behaviour or weakness
local KeeperPosTolerance = 0.04 -- if keeper's distance to the goals center is bigger, we will choose the big free sector
local shootErrorThreshold = 0.1 -- maximum position error

local ShootPenalty = (require "../base/class").new("Task.ShootPenalty", require "task/shoot")

local World = require "../base/world"
local G = World.Geometry
local geom = require "../base/geom"
local vis = require "../base/vis"

ShootPenalty.priority = 5
function ShootPenalty:_init(lookDir) 
	self.lookDir = lookDir
	self.targetPos = nil
end

function ShootPenalty:_canShoot()
	local roboDir = Vector.fromAngle(self._robot.dir)
	local goalLineDir = Vector.create(1, 0)
	local lookPos = geom.intersectLineLine(self._robot.pos, roboDir, G.OpponentGoal, goalLineDir)
	if not lookPos then
		return false
	end
	vis.addCircle("LookPos", lookPos, 0.02, vis.colors.red, true)
	return lookPos:distanceTo(self.targetPos) < shootErrorThreshold
end
function ShootPenalty:_rate() return 1 end

function ShootPenalty:_run(priorityMessages, notifications)
	if not self.targetPos then
		if fixedCorner then
			self.lookDir = fixedCorner
		elseif World.OpponentKeeper and math.abs(World.OpponentKeeper.pos.x) > KeeperPosTolerance then
			if World.OpponentKeeper.pos.x > 0 then
				self.lookDir = "Left"
			else
				self.lookDir = "Right"
			end
		else
			local otherDir = (self.lookdir == "Left") and "Right" or "Left"
			if math.random() > changeThreshold then
				self.lookDir = otherDir
			end
		end
		self.decided = true
		local goalLine = (G.OpponentGoalLeft - G.OpponentGoalRight):normalize()
		if self.lookDir == "Right" then
			self.targetPos = G["OpponentGoal"..self.lookDir] + (goalLine * distToPost)
		else
			self.targetPos = G["OpponentGoal"..self.lookDir] - (goalLine * distToPost)
		end
	end
	vis.addCircle("PenaltyTargetPos", self.targetPos, 0.02, vis.colors.blue, true)
	self:_shoot(self.targetPos, math.huge, true)
end

function ShootPenalty.test(id)
	if id > 0 then
		return nil
	end
	return (function(robots) return ShootPenalty.create(robots[1]) end), 1
end

return ShootPenalty