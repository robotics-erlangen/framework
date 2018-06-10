local AttackRatio = {}

local debug = require "../base/debug"
local Field = require "../base/field"
local World = require "../base/world"
local Ally = require "agent/ally"
local Ball = require "observer/ball"
local Robot = require "observer/robot"


function AttackRatio:init()
	self._friendlyFreeKickOngoing = false
	self._opponentFreeKickOngoing = false
	self._ballInOpponentFieldHalf = false -- remember for hysteresis
	self._dangerousDuelSituation = false
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
		attackRatio = 6
	elseif refState == "KickoffDefensivePrepare" or refState == "KickoffDefensive" then
		attackRatio = 3
	elseif refState == "DirectOffensive" or refState == "IndirectOffensive" then
		local friendlyCorner = Field.isInOwnCorner(ball.pos, false)
		local opponentCorner = Field.isInOwnCorner(ball.pos, true)
		if friendlyCorner then -- Goal-Kick Offensive
			attackRatio = 4
		elseif opponentCorner then -- Corner-Kick Offensive
			attackRatio = 7
		elseif ball.pos.y > 1.2 then
			attackRatio = 6 -- Throw-In Offensive
		else
			attackRatio = 4 -- Throw-In Offensive
		end
	elseif refState == "DirectDefensive" or refState == "IndirectDefensive" or refState == "BallPlacementDefensive" then
		local opponentCorner = Field.isInOwnCorner(ball.pos, true)
		if opponentCorner then
			attackRatio = 2
		else
			attackRatio = 1
		end
	elseif refState == "Stop" then
		attackRatio = 1
	elseif World.GameStage == "PenaltyShootout" then
		attackRatio = 8
	else -- Game, GameForce
		if self._opponentFreeKickOngoing then
			attackRatio = 1
		else
			attackRatio = self._ballInOpponentFieldHalf and 4 or 3
			if self._friendlyFreeKickOngoing then
				attackRatio = attackRatio + 1
			end
		end
	end

	return attackRatio
end

local previousMainAttacker = nil
function AttackRatio:attackerDefenderDistribution()
	local attackRatio = self:attackRatio()

	local attackers = attackRatio > 0 and math.max(1, math.floor(attackRatio/8 * #World.FriendlyRobots)) or 0

	local _, mainAttacker = next(self._inbox.mainAttacker())

	local mainAttackerIsDefender = false
	local previousMainAttackerIsDefender = false
	if mainAttacker then
		for robot, _ in pairs(self._inbox.defenderFlag()) do
			if robot == mainAttacker then
				mainAttackerIsDefender = true
			end
			if robot == previousMainAttacker then
				previousMainAttackerIsDefender = true
			end
		end
	end

	if mainAttackerIsDefender and previousMainAttacker and not previousMainAttackerIsDefender
			and Field.distanceToFriendlyDefenseArea(previousMainAttacker.pos, previousMainAttacker.radius) < 0.5 then
		-- being either a defender or an attacker is not a completet partitioning of an agents state
		-- it could also be currently hidden
		local isAttacker = false
		for robot, _ in pairs(self._inbox.attackerFlag()) do
			if robot == previousMainAttacker then
				isAttacker = true
			end
		end
		if isAttacker then
			self._send.forcePoolChange("trainer", { robot = previousMainAttacker, destPool = "defender" })
		end
	end
	if mainAttackerIsDefender then
		local mainAttackerWantsToChange = false
		for _,poolChangeEntry in ipairs(self:changingRobots()) do
			if poolChangeEntry.robot == mainAttacker then
				mainAttackerWantsToChange = true
				break
			end
		end
		if not mainAttackerWantsToChange then
			attackers = attackers - 1
		end
	end

	self._dangerousDuelSituation = Ball.isDangerousDuelSituation(self._dangerousDuelSituation)
	if self._dangerousDuelSituation then
		attackers = attackers - 1
	end
	debug.set("Dangerous Duel", self._dangerousDuelSituation)

	if mainAttacker and mainAttacker ~= previousMainAttacker then
		previousMainAttacker = mainAttacker
	end

	attackers = math.max(0, attackers)

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

function AttackRatio:changingRobots()
	local robots = {}
	local _,forcePoolChangeMsg = next(self._inbox.forcePoolChange())
	if forcePoolChangeMsg then
		for _,forcedChange in pairs(forcePoolChangeMsg) do
			table.insert(robots, forcedChange.robot)
		end
	end
	for sender,_ in pairs(self._inbox.poolChangeRequest()) do
		table.insert(robots, sender)
	end

	local robotList = {}
	for _,r in ipairs(robots) do
		table.insert(robotList, { robot = r, isAttacker = self._inbox.attackerFlag()[r]})
	end

	return robotList
end

return AttackRatio
