local Messaging = Class("Control.Messaging")

local Robot = require "../base/robot"
local checkType = require "../base/typecheck"


local msgDefs = {
	-- multiple senders
	allyFlag = "flag",
	attackerFlag = "flag",
	defendedOpponent = Robot,
	defenderFlag = "flag",
	forcePoolChange = "table", -- { robot: robot, destPool: string }
	kickoffMirrorFlag = "flag",
	kickoffPass = "cdata",
	kickoffStart = "number",
	moveDest = "cdata",
	passSuggestion = "table", -- { pos: Vector, time: number }
	poolChangeRequest = "string",
	strikerSamplingTimestamp = "number",

	-- single sender
	attackPosition = "cdata",
	centerBackPosTarget = "table", -- { pos: vector, target: table }
	moveAssignment = "table", -- { class: class, params: table }
	moveNumAttackers = "number",
	passInfo = "table", -- { target: robot, ballPos: vector, time: number }
	roleAssignment = "table", -- { name: string, params: table }
	shootDestination = "cdata",
	strikerZone = "table", -- { defaultPos: vector, boundaries: table }
}


local repeatedMessages = {
	exclusiveRole = "table",
	groupApplication = "table", -- { { name: string -> payload: table } }
}
for msg, msgType in pairs(repeatedMessages) do
	msgDefs[msg] = msgType
end


local exclusiveRoles = {
	mainAttacker = true,
}
for role, _ in pairs(exclusiveRoles) do
	msgDefs[role] = Robot
end


local empty = {}
setmetatable(empty, { __newindex = function()
	error("this table is supposed to be empty")
end })


function Messaging:init()
	self._newMessages = {} -- is reset every frame
	self._deliveredMessages = {} -- reference to the newMessages table of the last last frame
	-- messages are stored in the following format:
	-- messages = {
	-- 	messageTypeA = {
	-- 		Agent1 = { senderRobot1 = data, senderRobot2 = data}, ...
	-- 	},
	-- 	messageTypeB = { Agent3 = { senderRobot4 = data} }
	-- }
	self._robotToAgent = {} -- track registered agents
	self._trainerRegistered = false
end

function Messaging:registerAgent(agent)
	self._robotToAgent[agent:robot()] = agent
	return self:_constructSender(agent), self:_constructInbox(agent)
end

function Messaging:registerTrainer()
	assert(not self._trainerRegistered, "trainer is already registered!")
	self._trainerRegistered = true
	return self:_constructSender("trainer"), self:_constructInbox("trainer")
end

-- this method should be called once every frame
function Messaging:deliverMessages()
	self._deliveredMessages = self._newMessages
	self._newMessages = {}
end

function Messaging:_constructInbox(receiver)
	local inbox = {}
	for messageType, _ in pairs(msgDefs) do
		inbox[messageType] = function(mode)
			local mtypeBox = self._deliveredMessages[messageType]
			if receiver == "trainer" then
				mtypeBox = self._newMessages[messageType]
			end
			if not mtypeBox then
				return empty
			end
			-- returns all messages of "messageType" which were sent to "all"
			if mode == "broadcast" then
				if not mtypeBox.all then
					return empty
				end
				return mtypeBox.all
			elseif mode ~= nil then
				error("Invalid request mode only nil or \"broadcast\" is allowed")
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

function Messaging:_constructSender(sender)
	local sendObj = {}
	for messageType, requiredType in pairs(msgDefs) do
		sendObj[messageType] = function(receiver, data)
			-- although a sender is adressing a robot, a message is delivered
			-- to the corresponding agent. This ensures that a robot only receives
			-- messages sent in frames where he has had the current agent
			if receiver == nil then
				error("nil is not a valid receiver")
			elseif receiver ~= "all" and receiver ~= "trainer" then
				receiver = self._robotToAgent[receiver]
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
				checkType(data, requiredType)
			end
			local mtypeBox = self._newMessages[messageType]
			if not mtypeBox then
				mtypeBox = {}
				self._newMessages[messageType] = mtypeBox
			end
			local receiveBox = mtypeBox[receiver]
			if not receiveBox then
				receiveBox = {}
				mtypeBox[receiver] = receiveBox
			end
			local senderRobot = (sender == "trainer") and "trainer" or sender:robot()

			if repeatedMessages[messageType] then
				local collection = receiveBox[senderRobot]
				if not collection then
					collection = {}
				end
				table.insert(collection, data)
				receiveBox[senderRobot] = collection
			else
				receiveBox[senderRobot] = data
			end
		end
	end
	return sendObj
end

return Messaging
