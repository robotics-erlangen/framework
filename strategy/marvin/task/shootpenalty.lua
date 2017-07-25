local Shoot = require "task/ability/shoot"
local RotateAndShoot = require "task/ability/rotateandshoot"
local ShootPenalty = Class("Task.ShootPenalty", require "task/base",
	Shoot, RotateAndShoot)

local constants = require "../base/constants"
local debug = require "../base/debug"
local Field = require "../base/field"
local vis = require "../base/vis"
local World = require "../base/world"


local G = World.Geometry
--=====================--
-- Tournament Settings --
--=====================--
local distToPost = 0.08 -- distance of the target point on goal line to the post
local changeThreshold = 0.5 -- set 0 if opponent keeper follows look Dir every time
local KeeperPosTolerance = 0.04 -- if keeper's distance to the goals center is bigger, we will choose the big free sector
local shootErrorThreshold = 4.0 * math.pi/180 -- maximum angle error
local keeperMoveSpeedThreshold = 0.4 -- for random keeper movement detection


local goalLine = (G.OpponentGoalLeft - G.OpponentGoalRight):normalize()
local function cornerPoint(corner)
	if corner == "Left" then
		return G.OpponentGoalLeft - (goalLine * distToPost)
	else
		return G.OpponentGoalRight + (goalLine * distToPost)
	end
end

function ShootPenalty:_init()
		self._lookDir = "Right"
		if math.random() < 0.5 then
			self._lookDir = "Left"
		end
		self._targetPos = nil
		self._startTime = World.Time
		self._waitTime = math.random() * 5 + 2
		self._cornerChange = false
		self:_initRAS()
end

local DIST_TO_BALL = 0.015
function ShootPenalty:run()
	if not self._targetPos then
		local keeper = World.OpponentKeeper
		local keeperInsideDefArea =  keeper and Field.isInOpponentDefenseArea(keeper.pos, keeper.radius)
		debug.set("keeperInsideDefArea", keeperInsideDefArea)
		if World.Time - self._startTime < self._waitTime then
			self:_catchBall(cornerPoint(self._lookDir), constants.positionError + DIST_TO_BALL)
			if keeperInsideDefArea then -- detect random keeper movement
				if (keeper.speed.x > keeperMoveSpeedThreshold and self._lookDir == "Left") or
					(keeper.speed.x < -keeperMoveSpeedThreshold and self._lookDir == "Right")
				then
					log("keeper x speed: " .. keeper.speed.x)
					self._targetPos = cornerPoint(self._lookDir)
				end
			end
		else -- choose a corner
			if keeperInsideDefArea then
				if math.abs(keeper.pos.x) > KeeperPosTolerance then
					if keeper.pos.x > 0 then
						self._cornerChange = (self._lookDir ~= "Left")
						self._lookDir = "Left"
					else
						self._cornerChange = (self._lookDir ~= "Right")
						self._lookDir = "Right"
					end
				else
					local otherDir = (self._lookDir == "Left") and "Right" or "Left"
					if math.random() > changeThreshold then
						self._cornerChange = true
						self._lookDir = otherDir
					end
				end
			end
			self._targetPos = cornerPoint(self._lookDir)
		end
	else
		vis.addCircle("t/shootpenalty: PenaltyTargetPos", self._targetPos, 0.02, vis.colors.blue, true)
		if self._cornerChange then
			self:_rotateAndShoot((self._targetPos - World.Ball.pos):angle())
		else
			self:_shoot(self._targetPos, math.huge, nil, shootErrorThreshold)
		end
	end
end

return ShootPenalty
