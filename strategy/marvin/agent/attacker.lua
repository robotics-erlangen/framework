local Attacker = (require "../base/class").new("Agent.Attacker", require "agent/base")
local World = require "../base/world"

local Assistant = require "task/assistant"
local DirectPass = require "task/directpass"
local Duel = require "task/duel"
local ReceivePass = require "task/receivepass"
local ShootGoal = require "task/shootgoal"

local Ball = require "observer/ball"
local Robot = require "observer/robot"
local Rating = require "util/rating"

function Attacker.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Attacker:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper
end

Attacker._behaviours = {
	"ReceivePass",
	{"MainAttacker",
		"DefaultDuel",
		"DefaultShoot"
	},
	"Default"
}

function Attacker:checkReceivePass()
	for robot, msg in pairs(self._messages) do
		if msg.task.duelAssistantTarget == self._robot then
			return true
		end
	end
	return false
end

function Attacker:doReceivePass()
	if not self._task then
		self._task = ReceivePass.create(self._robot)
	end
end

function Attacker:checkMainAttacker()
	-- no main attacker if a play is manipulating the ball
	if self._trainerMessage.play then
		return false
	end
	
	local isMainAttacker = self._trainerMessage.specialTask.mainAttacker == self._robot
	
	local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
	local mainAttackerRating = Rating.timeToRating(timeToBall)
	return isMainAttacker, { specialTask = { mainAttacker = mainAttackerRating } }
end

function Attacker:checkDefaultDuel()
	if Ball.opponentBallOwner() then
		return true
	elseif self._behaviour == "DefaultDuel" and Ball.friendlyBallOwner() == self._robot then
		return true
	else
		return false
	end
end

function Attacker:doDefaultDuel()
	if not self._task then
		self._task = Duel.create(self._robot)
	end
end

function Attacker:checkDefaultShoot()
	return true
end

function Attacker:doDefaultShoot()
	if not self._task then
		--FIXME check which robot can be passed to
		local bestRobot = nil
		local bestRating = -1
		for robot, msg in pairs(self._messages) do
			local rating = msg.task.assistantRating
			if rating and rating > bestRating then
				bestRobot = robot
				bestRating = rating
			end
		end
		if bestRobot and math.random(100) < 70 then
			self._task = DirectPass.create(self._robot, bestRobot, true)
		else
			self._task = ShootGoal.create(self._robot)
		end
	end
end

function Attacker:checkDefault()
	return true
end

function Attacker:doDefault()
	if not self._task then
		self._task = Assistant.create(self._robot)
	end
end

return Attacker
