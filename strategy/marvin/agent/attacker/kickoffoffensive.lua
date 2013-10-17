local Base = require "agent/base/behavior"
local KickoffOffensive = (require "../base/class").new("Agent.Attacker.KickoffOffensive", Base)

local World = require "../base/world"
local G = World.Geometry
local Class = require "../base/class"
local vis = require "../base/vis"
local Ball = require "observer/ball"

local PassInTheRun = require "task/passintherun"
local ShootGoal = require "task/shootgoal"
local ChipAway = require "task/chipaway"
local Halt = require "task/halt"
local MoveToStaticBall = require "task/movetostaticball"

function KickoffOffensive:_stop()
	self._shootPos = nil
	self._targetRobot = nil
	self._passActiveSince = 0
	self._shootTime = 0
	self._cooldown = false
end

function KickoffOffensive:check()
	if not (self._inbox.mainAttacker().trainer == self._robot) then
		return false
	end
	
	if self._active and Ball.isShot() then -- I've shot the ball
		self._passActive = false
		self._shootTime = World.Time
		self._cooldown = true
		return true
	elseif self._cooldown then
		local friend = Ball.friendlyBallOwner()
		if Ball.opponentBallOwner() or (friend ~= nil and friend ~= self._robot) then
			return false
		end
		if self._shootTime + 3 < World.Time then
			return false
		end
		return true
	elseif World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive" then
		return true
	elseif self._passActiveSince + 5 > World.Time then
		return true
	end
	return false
end

local function minOppDist(pos)
	local minDistance = math.huge
	for _, robot in ipairs(World.OpponentRobots) do
		if robot ~= World.OpponentKeeper then
			minDistance = math.min(minDistance, robot.pos:distanceTo(pos))
		end
	end
	return minDistance
end

local function cmpByOpponentDist(pos1, pos2) 
	return minOppDist(pos1) > minOppDist(pos2)
end

function KickoffOffensive:_updateTask()
	-- decide once we switch to KickoffOffensive
	if (not self._targetRobot or not self._shootPos) and World.RefereeState == "KickoffOffensive" then
		-- search pos for pass in the run
		local nicePositions = {
			Vector.create(-G.FieldWidthQuarter*1.5, G.FieldHeightQuarter-0.1),
			Vector.create(-G.FieldWidthQuarter*1, G.FieldHeightQuarter-0.1),
			Vector.create(-G.FieldWidthQuarter*0.5, G.FieldHeightQuarter-0.05),
			Vector.create(G.FieldWidthQuarter*0.5, G.FieldHeightQuarter-0.05),
			Vector.create(G.FieldWidthQuarter*1, G.FieldHeightQuarter-0.1),
			Vector.create(G.FieldWidthQuarter*1.5, G.FieldHeightQuarter-0.1),
		}
		table.sort(nicePositions, cmpByOpponentDist)

		local function isReachable(pos)
			local isFree = true
			for _, robot in pairs(World.Robots) do
				if robot ~= self._robot then
					local _, distToBallCorridor = robot.pos:orthogonalProjection(World.Ball.pos, pos)
					isFree = isFree and (math.abs(distToBallCorridor) > (robot.radius + World.Ball.radius))
				end
			end
			return isFree
		end

		self._shootPos = table.filter(nicePositions, isReachable)[1]
		-- search nearest kickoff assi
		if self._shootPos then
			vis.addCircle("PassInTheRun", self._shootPos, 0.2, vis.colors.Red, true)
			local minDist = math.huge
			for robot, pos in pairs(self._inbox.moveDest()) do
				local dist = (pos-self._shootPos):length()
				if dist < minDist then
					minDist = dist
					self._targetRobot = robot
				end
			end
			if not self._targetRobot then
				self._shootPos = nil -- don't pass without a target
			end
		end
	end

	if World.RefereeState == "KickoffOffensivePrepare" then
		return MoveToStaticBall, { World.Geometry.OpponentGoal }
	else -- KickoffOffensive
		local shootGoalTmp = ShootGoal.create(self._agent)
		if shootGoalTmp:canShoot() then 
			return ShootGoal
		elseif self._shootPos then
			self._passActiveSince = World.Time
			return PassInTheRun, {self._targetRobot, self._shootPos}
		else
			return ChipAway
		end
	end
end

return KickoffOffensive
