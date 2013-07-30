local Defender = (require "../base/class").new("Agent.Defender", require "agent/base/agent")
local World = require "../base/world"

--local CenterBack = require "agent/defender/centerback"
local Default = require "agent/defender/default"
local HandleBall = require "agent/defender/handleball"
local Penalty = require "agent/defender/penalty"
local KickoffOffensive = require "agent/defender/kickoffoffensive"

function Defender.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Defender:_supplyBehaviors()
	return {
		-- referee states
		Penalty.create(self._robot, self.inbox, self.send),
		KickoffOffensive.create(self._robot, self.inbox, self.send),

		-- mainAttacker
		HandleBall.create(self._robot, self.inbox, self.send),

		--CenterBack.create(self._robot, self.inbox, self.send),
		Default.create(self._robot, self.inbox, self.send)
	}
end

function Defender:applyForMainattacker()
	if World.RefereeState ~= "PenaltyDefensivePrepare" and World.RefereeState ~= "PenaltyDefensive" then
		local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
		local mainAttackerRating = Rating.timeToRating(timeToBall)
		self.send("trainer"):specialRole({mainAttacker = mainAttackerRating})
	end
end

function Defender:keepRobot()
	if self._keepAlive then
		return 0
	end
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper
end

-- worse rating if robot if farther away from own goal
function Defender:rateRobot()
	return -World.Geometry.FriendlyGoal:distanceTo(self._robot.pos)
end

return Defender
