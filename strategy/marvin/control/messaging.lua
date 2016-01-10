local Messaging = {}

local Robot = require "../base/robot"
local checkType = require "../base/typecheck"


local msgDefs = {
	-- multiple senders
	attackerFlag = "flag",
	defenderFlag = "flag",
	allyFlag = "flag",
	attackerRequest = "flag",
	standardMoveFlag = "flag",
	centerbackTarget = "table", -- Robot or World.Ball
	preliminaryCenterbackTarget = "table",
	defendedOpponent = Robot,
	moveDest = "cdata",
	moveDestDir = "number",
	distractedIndex = "number",
	exclusiveRole = "table", -- value test is in getExclusiveRoleApplications
	kickoffMirrorFlag = "flag",
	passSuggestion = "table", -- { kind: string, rating: number [, pos: Vector, time: number] }
	kickoffPass = "cdata",
	kickoffStart = "number",
	targetTime = "number",

	-- single sender
	attackPosition = "cdata",
	aggressiveKeeperPos = "cdata",
	shootDestination = "cdata",
	passPos = "cdata", -- where the pass is shot
	duelAssistantPos = "cdata",
	duelAssistantDir = "number",
	roleAssignment = "table", -- { name: string, params: table }
}

local exclusiveRoles = {
	passReceiver = true,
	mainAttacker = true,
	cornerAttacker = true,
}
for role, _ in pairs(exclusiveRoles) do
	msgDefs[role] = Robot
end

local newMessages = {} -- is reset every frame
local deliveredMessages = {} -- reference to the newMessages table of the last last frame
-- messages are stored in the following format:
-- messages = {
-- 	messageTypeA = {
-- 		Agent1 = { senderRobot1 = data, senderRobot2 = data}, ...
-- 	},
-- 	messageTypeB = { Agent3 = { senderRobot4 = data} }
-- }
local robotToAgent = {} -- track registered agents
local trainerRegistered = false
local empty = {}
setmetatable(empty, { __newindex = function()
	error("this table is supposed to be empty")
end })
local constructSender, constructInbox -- to be defined

function Messaging.registerAgent(agent)
	robotToAgent[agent:robot()] = agent
	return constructSender(agent), constructInbox(agent)
end

function Messaging.registerTrainer()
	assert(not trainerRegistered, "trainer is already registered!")
	trainerRegistered = true
	return constructSender("trainer"), constructInbox("trainer")
end

-- this method should be called once every frame
function Messaging.deliverMessages()
	deliveredMessages = newMessages
	newMessages = {}
end

function constructInbox(receiver)
	local inbox = {}
	for messageType, requiredType in pairs(msgDefs) do
		inbox[messageType] = function()
			if not msgDefs[messageType] then
				error("request for invalid message type " .. messageType)
			end
			local mtypeBox = deliveredMessages[messageType]
			if receiver == "trainer" then
				mtypeBox = newMessages[messageType]
			end
			if not mtypeBox then
				return empty
			end
			local receiveBox = mtypeBox[receiver]
			local allBox = mtypeBox.all
			if not receiveBox and not allBox then
				return empty
			else
				if not receiveBox then
					receiveBox = {}
					mtypeBox[receiver] = receiveBox
				end
				if allBox then
					local allMerged = mtypeBox.allBoxMerged
					if not allMerged then
						allMerged = {}
						mtypeBox.allBoxMerged = allMerged
					end
					if not allMerged[receiver] then -- merge broadcasts into receiveBox
						local receiverRobot = (receiver == "trainer") and "trainer" or receiver:robot()
						for sender, data in pairs(allBox) do
							if sender ~= receiverRobot or sender == "trainer" then
								receiveBox[sender] = data
							end
						end
						allMerged[receiver] = true
					end
				end
				return receiveBox
			end
		end
	end
	return inbox
end

function constructSender(sender)
	local sendObj = {}
	for messageType, requiredType in pairs(msgDefs) do
		sendObj[messageType] = function(receiver, data)
			-- although a sender is adressing a robot, a message is delivered
			-- to the corresponding agent. This ensures that a robot only receives
			-- messages sent in frames where he has had the current agent
			if receiver == nil then
				error("nil is not a valid receiver")
			elseif receiver ~= "all" and receiver ~= "trainer" then
				receiver = robotToAgent[receiver]
				if not receiver then
					return -- not registered yet
				end
			end
			if requiredType == "flag" then
				if data then
					error("flag messages take no arguments")
				else
					data = true
				end
			else
				checkType(data, msgDefs[messageType])
			end
			local mtypeBox = newMessages[messageType]
			if not mtypeBox then
				mtypeBox = {}
				newMessages[messageType] = mtypeBox
			end
			local receiveBox = mtypeBox[receiver]
			if not receiveBox then
				receiveBox ={}
				mtypeBox[receiver] = receiveBox
			end
			local senderRobot = (sender == "trainer") and "trainer" or sender:robot()
			receiveBox[senderRobot] = data
		end
	end
	return sendObj
end

--- returns all messages of "messageType" which were sent to "all"
function Messaging.get(messageType)
	if not msgDefs[messageType] then
		error("request for invalid message type " .. messageType)
	end
	if not deliveredMessages[messageType] or not deliveredMessages[messageType].all then
		return empty
	end
	return deliveredMessages[messageType].all
end

return Messaging
