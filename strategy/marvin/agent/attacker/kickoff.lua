local Base = require "agent/base/behaviour"
local Kickoff = (require "../base/class").new("Agent.Attacker.Kickoff", Base)

local World = require "../base/world"
local Class = require "../base/class"
local vis = require "../base/vis"
local Ball = require "observer/ball"

local PassInTheRun = require "task/passintherun"
local ShootGoal = require "task/shootgoal"
local Halt = require "task/halt"
local MoveToStaticBall = require "task/movetostaticball"

function Kickoff:_stop(isAborted)
	self._shootPos = nil
	self._targetRobot = nil
	self._passActive = nil
	self._shootTime = 0
end

function Kickoff:_check()
	if self._state == Base.State.Active and Ball.isShot() then -- I've shot the ball
		self._passActive = false
		self._shootTime = World.Time
		return Base.State.CoolDown
	elseif self._state == Base.State.CoolDown then
		local friend = Ball.friendlyBallOwner()
		if Ball.opponentBallOwner() or (friend ~= nil and friend ~= self._robot) then
			return Base.State.Inactive
		end
		if self._shootTime + 3 < World.Time then
			return Base.State.Inactive
		end
		return Base.State.CoolDown
	elseif World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive" then
		return Base.State.Active
	elseif self._passActive then
		return Base.State.Active
	end
	return Base.State.Inactive
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

function Kickoff:_run()
	-- decide once we switch to KickoffOffensive
	if (not self._targetRobot or not self._shootPos) and World.RefereeState == "KickoffOffensive" then
		-- search pos for pass in the run
		local nicePositions = {
			Vector.create(-1.5, 1.4),
			Vector.create(-1, 1.4),
			Vector.create(-0.5, 1.45),
			Vector.create(0.5, 1.45),
			Vector.create(1.0, 1.4),
			Vector.create(1.5, 1.4),
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

		self._shootPos = table.filter(nicePositions, isReachable)[1] or nicePositions[1]
		vis.addCircle("PassInTheRun", self._shootPos, 0.2, vis.colors.Red, true)
		-- search nearest kickoff assi
		local minDist = math.huge
		for robot, msg in pairs(self._messages) do
			if msg.agent.targetPos then
				local dist = (msg.agent.targetPos-self._shootPos):length()
				if dist < minDist then
					minDist = dist
					self._targetRobot = robot
				end
			end
		end
	end

	if World.RefereeState == "KickoffOffensivePrepare" or not self._robot:isCharged() then
		if not self._task or not Class.instanceOf(self._task, MoveToStaticBall) then
			self._task = MoveToStaticBall.create(self._robot, World.Geometry.OpponentGoal)
		end
	elseif World.RefereeState == "KickoffOffensive" then
		local shootGoalTask = ShootGoal.create(self._robot)
		if shootGoalTask:canShoot() then 
			if not self._task or not Class.instanceOf(self._task, ShootGoal) then
				self._task = shootGoalTask
			end
		else
			if not self._task or not Class.instanceOf(self._task, PassInTheRun) then
				self._task = PassInTheRun.create(self._robot, self._targetRobot, self._shootPos)
				self._passActive = true
			end
		end
	end
end

return Kickoff
