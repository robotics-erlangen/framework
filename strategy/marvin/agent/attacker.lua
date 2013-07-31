local Attacker = (require "../base/class").new("Agent.Attacker", require "agent/base/agent")
local World = require "../base/world"
local Robot = require "observer/robot"
local Rating = require "util/rating"

local ReceivePass = require "agent/attacker/receivepass"
local KickoffAssistant = require "agent/attacker/kickoffassistant"
local KickoffOffensive = require "agent/attacker/kickoffoffensive"
local Stop = require "agent/attacker/stop"
local Duel = require "agent/attacker/duel"
local Shoot = require "agent/attacker/shoot"
local Penalty = require "agent/attacker/penalty"
local FreeKick = require "agent/attacker/freekick"
local FreeKickDefender = require "agent/attacker/freekickdefender"
local Default = require "agent/attacker/default"

function Attacker.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Attacker:_supplyBehaviors()
	return {
		ReceivePass.create(self._robot, self.inbox, self.send),
		
		-- mainAttacker behaviors
		Stop.create(self._robot, self.inbox, self.send),
		KickoffOffensive.create(self._robot, self.inbox, self.send),
		Penalty.create(self._robot, self.inbox, self.send),
		FreeKick.create(self._robot, self.inbox, self.send),
		Duel.create(self._robot, self.inbox, self.send),
		Shoot.create(self._robot, self.inbox, self.send),

		KickoffAssistant.create(self._robot, self.inbox, self.send),
		FreeKickDefender.create(self._robot, self.inbox, self.send),
		Default.create(self._robot, self.inbox, self.send)
	}
end

function Attacker:applyForMainAttacker()
	if World.RefereeState ~= "PenaltyDefensivePrepare" and World.RefereeState ~= "PenaltyDefensive" then
		local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
		local mainAttackerRating = Rating.timeToRating(timeToBall)
		self.send("trainer").specialRole({mainAttacker = mainAttackerRating})
	end
end

function Attacker:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper
end

-- worse rating if robot if farther away from opponent goal
function Attacker:rateRobot()
	if self._keepAlive then
		return 0
	end
	return -World.Geometry.OpponentGoal:distanceTo(self._robot.pos)
end

return Attacker
