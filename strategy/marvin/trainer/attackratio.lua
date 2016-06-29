local AttackRatio = {}

local debug = require "../base/debug"
local Field = require "../base/field"
local vis = require "../base/vis"
local World = require "../base/world"
local Ally = require "agent/ally"
local Robot = require "observer/robot"


function AttackRatio:init()
    self._oppFreeKickOngoing = false
    self._ballInOpponentFieldHalf = false -- remember for hysteresis
end

function AttackRatio:attackRatio()
    local ball = World.Ball
	local refState = World.RefereeState
	if (self._ballInOpponentFieldHalf and ball.pos.y < -1) or
		(not self._ballInOpponentFieldHalf and ball.pos.y > 1)
	then
		self._ballInOpponentFieldHalf = not self._ballInOpponentFieldHalf
	end
	if refState ~= "Game" then
		self._oppFreeKickOngoing = false
	end

	local attackRatio
	if refState == "KickoffOffensivePrepare" or refState == "KickoffOffensive" then
		attackRatio = 4
	elseif refState == "KickoffDefensivePrepare" or refState == "KickoffDefensive" then
		attackRatio = 3
	elseif refState == "DirectOffensive" or refState == "IndirectOffensive" then
		local friendlyCorner = Field.isInOwnCorner(ball.pos, false)
		local opponentCorner = Field.isInOwnCorner(ball.pos, true)
		if friendlyCorner then -- Goal-Kick Offensive
			attackRatio = 3
		elseif opponentCorner then -- Corner-Kick Offensive
			attackRatio = 4
		else
			attackRatio = 3 -- Throw-In Offensive
		end
	elseif refState == "DirectDefensive" or refState == "IndirectDefensive" then
		self._oppFreeKickOngoing = true
		local G = World.Geometry
		local distToBorder = G.FieldWidthHalf - G.DefenseStretch/2 - G.DefenseRadius
		if Field.distanceToFriendlyDefenseArea(ball.pos, ball.radius) < distToBorder then
			-- we do not want a stop attacker because
			-- the default centerback makes its job obsolete
			attackRatio = 0
		else
			attackRatio = 1
		end
	elseif refState == "Stop" then
		attackRatio = 1
	elseif World.GameStage == "PenaltyShootout" then
		attackRatio = 6
	else -- Game, GameForce
		for _, robot in ipairs(World.FriendlyRobots) do
			if Robot.hadBall(robot, 0) then
				self._oppFreeKickOngoing = false
				break
			end
		end
		if self._oppFreeKickOngoing then
			attackRatio = 1
		else
			attackRatio = self._ballInOpponentFieldHalf and 3 or 2
		end
	end

	local attackers = math.ceil(attackRatio/6 * #World.FriendlyRobots)

    local _, mainAttacker = next(self._inbox.mainAttacker())
	local mainAttackerIsDefender = false
	if mainAttacker then
		for robot, _ in pairs(self._inbox.defenderFlag()) do
			if robot == mainAttacker then
				mainAttackerIsDefender = true
			end
		end
		local color = World.TeamIsBlue and vis.colors.blue or vis.colors.yellow
		vis.addCircle("c/coordinator: MainAttacker", mainAttacker.pos, 0.12, color, true, true);
	end
	if mainAttackerIsDefender and not (self:changingRobot() == mainAttacker) then
		attackers = attackers - 1
	end

    debug.set("MainAttackerIsDefender", mainAttackerIsDefender)
	debug.set("AttackRatio", attackRatio)

	local defenders = #World.FriendlyRobots - attackers
	if World.FriendlyKeeper and World.FriendlyKeeper.isVisible then
		defenders = math.max(0, defenders - 1)
	end
    attackers, defenders = Ally.updateRoleNumbers(attackers, defenders)
	return attackers, defenders
end

function AttackRatio:changingRobot()
    local robot = next(self._inbox.poolChangeRequest())
    local isAttacker = self._inbox.attackerFlag()[robot]
    return robot, isAttacker
end

return AttackRatio
