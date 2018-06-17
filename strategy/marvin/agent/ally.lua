local Base = require "agent/base/agent"
local Ally = Class("Agent.Ally", Base)

local MixedTeam = require "../base/mixedteam"
local vis = require "../base/vis"
local World = require "../base/world"

local Physics = require "observer/physics"

local PassSuggestion = require "task/ability/suggestpass"

Ally._behaviors = {}

local attackerAllies = {}
local defenderAllies = {}
function Ally.updateRoleNumbers(attackers, defenders)
	return attackers-table.count(attackerAllies), defenders-table.count(defenderAllies)
end

function Ally:init(robot, messaging)
	Base.init(self, robot, messaging)
	self._suggestPass = PassSuggestion._suggestPass -- HACK
	self._noOppDisturbing = PassSuggestion._noOppDisturbing
end

-- below this distance from dribbler to ball, an ally is considered mainAttacker

--
local MASTER = true
local ALLY_MAINATTACKER_DIST = MASTER and 0 or 10
local MIN_DIST_FOR_PASS_POS = 0.2
local timeSentToPartnerTeam = 0 -- messaging the allied team should only happen once per frame
function Ally:_run()
	self._send.allyFlag("all")

	-- send messages from own robots to partner team
	-- should only be done once and if there is at least one ally
	if timeSentToPartnerTeam ~= World.Time then
		local mixedTeamMessage = {}
		local allies = self._inbox.allyFlag()
		for name, func in pairs(self._inbox) do
			if name == "moveDest" then
				for sender, msg in pairs(func()) do
					if not allies[sender] then
						if not mixedTeamMessage[sender.id] then
							mixedTeamMessage[sender.id] = {}
						end
						mixedTeamMessage[sender.id]["targetPos"] = msg
					end
				end
			elseif name == "passInfo" then
				local sender, info = next(func())
				if sender then
					local pos = info.ballPos
					local receiver = info.target
					if not mixedTeamMessage[receiver.id] then
						mixedTeamMessage[receiver.id] = {}
					end
					mixedTeamMessage[receiver.id]["targetPos"] = pos
					mixedTeamMessage[receiver.id]["shootPos"] = pos
				end
			elseif name == "attackPosition" then
				local sender, pos = next(func())
				if sender then
					if not mixedTeamMessage[sender.id] then
						mixedTeamMessage[sender.id] = {}
					end
					mixedTeamMessage[sender.id]["shootPos"] = pos
				end
			elseif name == "attackerFlag" then
				for sender, _ in pairs(func()) do
					if not allies[sender] then
						if not mixedTeamMessage[sender.id] then
							mixedTeamMessage[sender.id] = {}
						end
						mixedTeamMessage[sender.id]["role"] = "Offense"
					end
				end
			elseif name == "defenderFlag" then
				for sender, _ in pairs(func()) do
					if not allies[sender] then
						if not mixedTeamMessage[sender.id] then
							mixedTeamMessage[sender.id] = {}
						end
						mixedTeamMessage[sender.id]["role"] = "Defense"
					end
				end
			end
		end
		if World.FriendlyKeeper and not allies[World.FriendlyKeeper] then
			if not mixedTeamMessage[World.FriendlyKeeper.id] then
				mixedTeamMessage[World.FriendlyKeeper.id] = {}
			end
			mixedTeamMessage[World.FriendlyKeeper.id]["role"] = "Goalie"
		end
		MixedTeam.sendInfo(mixedTeamMessage)
		timeSentToPartnerTeam = World.Time
	end

	-- send messages from partner team to own robots
	local allyMessages = World.MixedTeam and World.MixedTeam[self._robot.id] or {}
	for msgType, msg in pairs(allyMessages) do
		if msgType == "role" then
			if msg == "Offense" then
				self._send.attackerFlag("all")
				self:_suggestPassRobotPosition(self._robot.pos)
				attackerAllies[self._robot] = true
				defenderAllies[self._robot] = nil
			elseif msg == "Defense" then
				self._send.defenderFlag("all")
				attackerAllies[self._robot] = nil
				defenderAllies[self._robot] = true
			else
				attackerAllies[self._robot] = nil
				defenderAllies[self._robot] = nil
			end
		elseif msgType == "targetPos" then
			vis.addPath("MoveTo", {self._robot.pos, msg}, vis.colors.whiteHalf)
			vis.addCircle("MoveTo", msg, 0.15, vis.colors.orangeHalf, true)
			self._send.moveDest("all", msg)
		elseif msgType == "shootPos" then
			local passPosSent = false
			for robot, _ in pairs(self._inbox.attackerFlag()) do
				if robot.pos:distanceTo(msg) < MIN_DIST_FOR_PASS_POS then
					vis.addCircle("a/ally/passpos", msg, 0.15, vis.colors.redHalf, true)
					self._send.passInfo("broadcast", { target = robot, ballPos = msg })
					passPosSent = true
					break
				end
			end
			if not passPosSent then
				vis.addCircle("a/ally/attackposition", msg, 0.15, vis.colors.magentaHalf, true)
				self._send.attackPosition("all", msg)
				self._send.attackTime("all", World.Time + Physics.robotTimeToPos(self._robot, msg, Vector(0, 0)))
			end
		end
	end

	-- mainAttacker application
	local ballPos = World.Ball.pos
	local dirVector = Vector.fromAngle(self._robot.dir)
	local dribblerPos = self._robot.pos + dirVector*self._robot.shootRadius
	local ballDist = dribblerPos:distanceTo(ballPos)
	if ballDist < ALLY_MAINATTACKER_DIST and World.Ball.speed:length() < 1 then
		for _, robot in ipairs(World.FriendlyRobots) do
			if robot ~= self._robot and robot.pos:distanceTo(World.Ball.pos) < 0.15 then
				return -- no application if someone already has the ball
			end
		end
		self._send.exclusiveRole("trainer", {mainAttacker = 2})
	end
end

local robotsDefinitelyInOurTeam = {
	-- in case of radio problems, list ids here in format id = true
}

function Ally.takeRobot(robots)
	for _, robot in ipairs(robots) do
		if robot.isVisible and robot.generation == robot.ALLY_GENERATION_ID
				and not robotsDefinitelyInOurTeam[robot.id] then
			return robot
		end
	end
end

function Ally:keepRobot()
	return self._robot.isVisible and self._robot.generation == self._robot.ALLY_GENERATION_ID
		and not self._robot.userControl
		and not robotsDefinitelyInOurTeam[self._robot.id]
end

function Ally:rateRobot()
	return 0
end

return Ally
