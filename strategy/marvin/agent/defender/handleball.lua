local Base = require "agent/base/behavior"
local HandleBall = Class("Agent.Defender.HandleBall", Base)

local World = require "../base/world"
local geom = require "../base/geom"
local Referee = require "../base/referee"
local debug = require "../base/debug"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local Field = require "../base/field"
local CenterBack = require "task/centerback"
local SaveBall = require "task/saveball"
local InterceptPass = require "task/interceptpass"


-- if the ball will reach our defense area with at least that speed, stay defender
local DANGEROUS_BALL_SPEED = 1.0

-- the ball is considered as a pass (and maybe as 'interceptable') if it rolls at at least that speed
local MIN_PASS_INTERCEPTION_SPEED = 1.0

-- the robot is considered as standing -> no passes in the run
local STATIONARY_ROBOT_SPEED = 0.5

-- extra time for making the decisions less risky
local EXTRA_TIME_CLEAN = 0.8
local EXTRA_TIME_DIRTY = 0.2


function HandleBall:_stop()
	self._interceptingPass = false
end

function HandleBall:_interceptBall()
	-- consider all opponents that can catch the ball sooner than us as passReceipients
	local friendlyTime = Robot.minTimeToBall(self._robot)
	local outTime = Physics.ballOutTime(World.Ball)
	local timeLimit = math.min(friendlyTime + EXTRA_TIME_DIRTY, outTime)
	local passReceipients = {}
	local minOppTime = math.huge
	for _,r in ipairs(World.OpponentRobots) do
		local oppTime = Robot.minTimeToBall(r)
		if oppTime < minOppTime then
			minOppTime = oppTime
		end
		if oppTime < timeLimit then
			table.insert(passReceipients, r)
		end
	end

	if #passReceipients == 0 then
		if friendlyTime + EXTRA_TIME_CLEAN < minOppTime then
			-- MTTB(friendly) + EXTRA_TIME_CLEAN < MTTB(fastestOpponent)
			-- or MTTB(fastestOpponent) > outTime
			return "clean"
		else
			-- MTTB(friendly) + EXTRA_TIME_DIRTY < MTTB(fastestOpponent)
			return "dirty"
		end
	end

	local minLambdaBall = math.huge
	local minBallTime = math.huge
	if World.Ball.speed:length() > MIN_PASS_INTERCEPTION_SPEED then
		for _,r in ipairs(passReceipients) do
			if r.speed:length() < STATIONARY_ROBOT_SPEED then
				-- if the opponent is slow/standing, calculate its ball receive position
				local ballDir = World.Ball.speed:copy():normalize()
				local robotOnBallLine, lambdaBall = geom.intersectLineLine(World.Ball.pos, ballDir, r.pos, ballDir:perpendicular())
				local robotTime = Physics.robotTimeToPos(r, robotOnBallLine, Vector(0, 0), false)
				local ballTime = Physics.ballRollTime(World.Ball, math.min(0, lambdaBall - r.shootRadius))
				if robotTime < ballTime then
					if lambdaBall < minLambdaBall then
						minLambdaBall = lambdaBall
						minBallTime = ballTime
					end
				end
			else
				-- do not try to intercept passes in the run, for now
				return "impossible"
			end
		end
	else
		-- if the ball is too slow, let an attacker do the job
		return "impossible"
	end

	-- check if we are fast enough
	if friendlyTime + EXTRA_TIME_CLEAN < minBallTime then
		return "clean"
	elseif friendlyTime + EXTRA_TIME_DIRTY < minBallTime then
		return "dirty"
	else
		return "impossible"
	end
end

function HandleBall:check()
	-- in case of special referee states, let other robots handle the ball
	if Referee.isFriendlyFreeKickState() or Referee.isStopState() or Referee.isKickoffState() then
		return false
	end

	-- do not try to get the ball if it is inside our defense area (it's the keeper's job)
	if Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius) then
		return false
	end

	-- if the ball rolls towards our defense area with high speed, stay defender
	local defenseLineIntersection = Field.intersectLineDefenseArea(World.Ball.pos, World.Ball.speed)
	if defenseLineIntersection then
		local timeToDefenseLine = Physics.ballRollTime(World.Ball,
			World.Ball.pos:distanceTo(defenseLineIntersection))
		local speedAtDefenseLine = Physics.ballAtTime(World.Ball, timeToDefenseLine).speed:length()
		if speedAtDefenseLine > DANGEROUS_BALL_SPEED then
			return false
		end
	end

	log(self:_interceptBall())

	return self._inbox.mainAttacker().trainer == self._robot
end

function HandleBall:_updateTask()
	local changeDist = World.Geometry.FieldHeight / 4
	local defenseDist = Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius)
	local firstRobot, timeAdvance = Ball.firstAtBall()

	local minAttackDist = World.IsLargeField and 1.7 or 1.2
	if self._robot:hasBall(World.Ball) or defenseDist > changeDist or
			firstRobot == self._robot and timeAdvance > 1 and
			Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius) > minAttackDist
	then
		self._send.attackerRequest("trainer")
		self._requestingPoolChange = true
	end

	if Ball.receivesPass(self._robot) then
		self._interceptingPass = (Ball.friendlyBallOwner() ~= self._robot)
		return InterceptPass
	else
		self._interceptingPass = false
		return SaveBall
	end
end

return HandleBall
