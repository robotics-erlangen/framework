local AttackRatio = {}

local debug = require "../base/debug"
local Field = require "../base/field"
local World = require "../base/world"
local Ally = require "agent/ally"
local Robot = require "observer/robot"


function AttackRatio:init()
	self._friendlyFreeKickOngoing = false
	self._opponentFreeKickOngoing = false
	self._ballInOpponentFieldHalf = false -- remember for hysteresis
end

function AttackRatio:attackRatio()
	local ball = World.Ball
	local refState = World.RefereeState
	if (self._ballInOpponentFieldHalf and ball.pos.y < -1.5) or
		(not self._ballInOpponentFieldHalf and ball.pos.y > 1.5)
	then
		self._ballInOpponentFieldHalf = not self._ballInOpponentFieldHalf
	end

	if refState == "DirectDefensive" or refState == "IndirectDefensive" then
		self._opponentFreeKickOngoing = true
	elseif refState ~= "Game" then
		self._opponentFreeKickOngoing = false
	else
		for _, robot in ipairs(World.FriendlyRobots) do
			if Robot.hadBall(robot, 0) then
				self._opponentFreeKickOngoing = false
				break
			end
		end
	end

	if refState == "DirectOffensive" or refState == "IndirectOffensive"
		or refState == "KickoffOffensive" then
		self._friendlyFreeKickOngoing = true
	elseif refState ~= "Game" then
		self._friendlyFreeKickOngoing = false
	else
		for _, robot in ipairs(World.OpponentRobots) do
			if Robot.hadBall(robot, 0) then
				self._friendlyFreeKickOngoing = false
				break
			end
		end
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
		attackRatio = 1
	elseif refState == "Stop" then
		attackRatio = 1
	elseif World.GameStage == "PenaltyShootout" then
		attackRatio = 6
	else -- Game, GameForce
		if self._opponentFreeKickOngoing then
			attackRatio = 1
		else
			attackRatio = self._ballInOpponentFieldHalf and 3 or 2
			if self._friendlyFreeKickOngoing then
				attackRatio = attackRatio + 1
			end
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
	end
	if mainAttackerIsDefender and not (self:changingRobot() == mainAttacker) then
		attackers = attackers - 1
	end

	debug.set("MainAttackerIsDefender", mainAttackerIsDefender)
	debug.set("AttackRatio", attackRatio)

	local moveNumAttackers = self._inbox.moveNumAttackers().trainer
	if moveNumAttackers then
		attackers = moveNumAttackers
	end

	local defenders = #World.FriendlyRobots - attackers
	if World.FriendlyKeeper and World.FriendlyKeeper.isVisible then
		defenders = math.max(0, defenders - 1)
	end
	attackers, defenders = Ally.updateRoleNumbers(attackers, defenders)
	return attackers, defenders
end

function AttackRatio:changingRobot()
	local _,forcedChange = next(self._inbox.forcePoolChange())
	local robot = forcedChange and forcedChange.robot or next(self._inbox.poolChangeRequest())
	local isAttacker = self._inbox.attackerFlag()[robot]
	return robot, isAttacker
end

return AttackRatio
