local Base = require "agent/base/behaviour"
local Kickoff = (require "../base/class").new("Agent.Attacker.Kickoff", Base)

local World = require "../base/world"
local Class = require "../base/class"
local vis = require "../base/vis"

local PassInTheRun = require "task/passintherun"
local ShootGoal = require "task/shootgoal"
local Halt = require "task/halt"
local MoveToStaticBall = require "task/movetostaticball"

function Kickoff:_check()
	local isKickoff = World.RefereeState == "KickoffOffensivePrepare" or World.RefereeState == "KickoffOffensive"
	return (isKickoff and Base.State.Active or Base.State.Inactive)
end

function Kickoff:_run()
	if World.RefereeState == "KickoffOffensivePrepare" then
		if self._robot:hasBall(World.Ball) then
			if not self._task or Class.name(self._task, true) ~= "Halt" then
				self._task = Halt.create(self._robot)
			end
		else
			if not self._task or Class.name(self._task, true) ~= "MoveToStaticBall" then
				self._task = MoveToStaticBall.create(self._robot, World.Geometry.OpponentGoal)
			end
		end

		-- search pos for pass in the run
		local nicePositions = {
			Vector.create(-1.5, 1.4),
			Vector.create(-1, 1.4),
			Vector.create(-0.5, 1.45),
			Vector.create(0.5, 1.45),
			Vector.create(1.0, 1.4),
			Vector.create(1.5, 1.4),
		}
		local function cmpByOpponentDist(pos1, pos2) 
			local minDistance1 = math.huge
			for _, robot in ipairs(World.OpponentRobots) do
				if robot ~= World.OpponentKeeper then
					minDistance1 = math.min(minDistance1, (robot.pos - pos1):length())
				end
			end
			local minDistance2 = math.huge
			for _, robot in ipairs(World.OpponentRobots) do
				if robot ~= World.OpponentKeeper then
					minDistance2 = math.min(minDistance1, (robot.pos - pos1):length())
				end
			end
			return minDistance1 > minDistance2
		end
		local function isReachable(pos)
			local isFree = true
			for _, robot in pairs(table.combine(World.FriendlyRobots, World.OpponentRobots)) do
				if robot ~= self._robot then
					local _, distToBallCorridor = robot.pos:orthogonalProjection(World.Ball.pos, pos)
					isFree = isFree and (math.abs(distToBallCorridor) > (robot.radius + World.Ball.radius))
				end
			end
			return isFree
		end
		table.sort(nicePositions, cmpByOpponentDist)
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
	elseif World.RefereeState == "KickoffOffensive" then
		local shootGoalTask = ShootGoal.create(self._robot)
		if shootGoalTask:canShoot() then 
			if not self._task or Class.name(self._task, true) ~= "ShootGoal" then
				self._task = shootGoalTask
			end
		else
			if not self._task or Class.name(self._task, true) ~= "ShootGoal" then
				self._task = PassInTheRun.create(self._robot, self._targetRobot, self._shootPos)
			end
		end
	end
end

function Kickoff:_stop(isAborted)
	self._shootPos = nil
	self._targetRobot = nil
end

return Kickoff
