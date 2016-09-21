local Base = require "agent/base/behavior"
local Behavior = Class("Agent.Moves.MRLCorner", Base)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local World = require "../base/world"

local Shooter = require "moves/mrlcorner/shooter"
local Ball = require "observer/ball"
local MoveToPos = require "task/movetopos"
local MoveToStaticBall = require "task/movetostaticball"
local Pass = require "task/pass"
local ShootGoal = require "task/shootgoal"

local MrlCorner = Class("Behavior.MrlCorner", Behavior)


local G = World.Geometry
local ENABLE = true

local ROLES = {
	"distractor",
	"distractor",
	"distractor",
	"assistant",
	"shooter"
}

local DISTRACTOR_POSITIONS = {
	Vector(-0.2, G.FieldHeightHalf-G.DefenseRadius-0.35),
	Vector(0, G.FieldHeightHalf-G.DefenseRadius-0.35),
	Vector(0.2, G.FieldHeightHalf-G.DefenseRadius-0.35)
}

function MrlCorner:_stop()
	self._stayActive = false
	self._role = nil
	self._distractorPos = nil
	self._freeKickOver = false
	self._shooter = nil
	self._assistant = nil
	self._shootGoalActive = false
end

local function outOfField(ball)
	return math.abs(ball.pos.x) > G.FieldWidthHalf
		and math.abs(ball.pos.y) > G.FieldHeightHalf
end

local function sortById(robot1, robot2)
	return robot1.id < robot2.id
end

local activeStates = {
	Stop = true,
	DirectOffensive = true,
	IndirectOffensive = true
}

function MrlCorner:check()
	if not ENABLE then
		return false
	else
		local applicable = World.Ball.pos.y > G.FieldHeightHalf/2
			and activeStates[World.RefereeState] and Referee.opponentTouchedLast()
		if self._stayActive and not activeStates[World.RefereeState] then
			self._freeKickOver = true
		elseif applicable then
			self._send.standardMoveFlag("all")
			local involvedRobots = {}
			for robot, _ in pairs(self._inbox.standardMoveFlag("broadcast")) do
				table.insert(involvedRobots, robot)
			end
			if #involvedRobots ~= #ROLES then -- wait for the messages to arrive
				return false
			end
			table.sort(involvedRobots, sortById)
			for i, robot in ipairs(involvedRobots) do
				if robot == self._robot then
					self._role = ROLES[i]
					if ROLES[i] == "distractor" then
						self._distractorPos = DISTRACTOR_POSITIONS[i]
					end
				end
				if ROLES[i] == "shooter" then
					self._shooter = robot
				end
				if ROLES[i] == "assistant" then
					self._assistant = robot
				end
			end
			assert(self._role, "role assignment of standard move went wrong")
			if Referee.isFriendlyFreeKickState() then
				self._stayActive = true
			end
			return true
		end
		if applicable or self._stayActive then
			self._send.standardMoveFlag("all")
			debug.set("freekick over", self._freeKickOver)
			return true
		end
		return false
	end
end

function MrlCorner:_oppIntercepted()
	return self._freeKickOver and Ball.isShot() and Referee.opponentTouchedLast()
end

function MrlCorner:_updateTask()
	if self._freeKickOver and
			(outOfField(World.Ball)
			or self:_oppIntercepted()
			or Ball.isShot() == self._shooter) then
		self._stayActive = false
	end

	if self._role == "shooter" then
		if Ball.isShot() or self._shootGoalActive then -- maybe coordinate via messages
			self._shootGoalActive = true
			return ShootGoal
		else
			return Shooter, { self._assistant }
		end
	elseif self._role == "assistant" then
		if Ball.isShot() == self._robot then
			self._stayActive = false
		end
		local passReceiver, passData = next(self._inbox.passSuggestion())
		if passReceiver then
			return Pass, { passReceiver}
		else
			return MoveToStaticBall
		end
	elseif self._role == "distractor" then
		return MoveToPos, { self._distractorPos, 0 }
	else
		error("unknown role " .. self._role)
	end
end

return MrlCorner
