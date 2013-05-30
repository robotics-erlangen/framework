local AttackGroup = (require "../base/class").new("Agent.Attacker.AttackGroup", require "agent/base/group")
local World = require "../base/world"
local Robot = require "observer/robot"
local Rating = require "util/rating"

function AttackGroup:_check()
	-- no main attacker if a play is manipulating the ball
	if self._trainerMessage.play then
		return false
	end
	
	local message = nil
	-- apply for playing the ball
	local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
	local mainAttackerRating = Rating.timeToRating(timeToBall)
	message = { specialTask = { mainAttacker = mainAttackerRating } }

	local isMainAttacker = self._trainerMessage.specialTask.mainAttacker == self._robot
	return isMainAttacker, message
end

return AttackGroup
