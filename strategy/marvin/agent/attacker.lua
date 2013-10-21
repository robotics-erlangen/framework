local Attacker = (require "../base/class").new("Agent.Attacker", require "agent/base/agent")

local World = require "../base/world"

local ReceivePass = require "agent/attacker/receivepass"
local ApplyForMainattacker = require "agent/attacker/applyformainattacker"
local Stop = require "agent/attacker/stop"
local KickoffOffensive = require "agent/attacker/kickoffoffensive"
local Penalty = require "agent/attacker/penalty"
local FreeKick = require "agent/attacker/freekick"
local Duel = require "agent/attacker/duel"
local Shoot = require "agent/attacker/shoot"
local KickoffAssistant = require "agent/attacker/kickoffassistant"
local FreeKickDefender = require "agent/attacker/freekickdefender"
local Default = require "agent/attacker/default"
local KickoffDefensive = require "agent/attacker/kickoffdefensive"

Attacker._behaviors = {
	ReceivePass,
	ApplyForMainattacker,
	Stop,
	KickoffOffensive,
	Penalty,
	FreeKick,
	Duel,
	Shoot,
	KickoffAssistant,
	FreeKickDefender,
	KickoffDefensive,
	Default
}

function Attacker.takeRobot(robots)
	for _, robot in pairs(robots) do
		if robot.isVisible then
			return robot
		end
	end
end

function Attacker:keepRobot()
	return self._robot.isVisible and self._robot ~= World.FriendlyKeeper and not self._robot.userControl
end

-- worse rating if robot if farther away from opponent goal
function Attacker:rateRobot()
	if self._activeBehavior and self._activeBehavior:forceKeepingInPool()  then
		return 0
	end
	local toOpponentGoal = World.Geometry.OpponentGoal:distanceTo(self._robot.pos)
	local toBall = self._robot.pos:distanceTo(World.Ball.pos)
	-- if we are 0.5m away from the ball, it counts as much as a whole field height at the distance to opp goal
	-- k * exp(-0.5) = FieldHeight
	-- k = exp(0.5) * FieldHeight
	local k = math.exp(0.5) * World.Geometry.FieldHeight
	return k * math.exp(-toBall) - toOpponentGoal
end

return Attacker
