local Messaging = Class("Control.Messaging")

local Robot = require "../base/robot"
local checkType = require "../base/typecheck"


local msgDefs = {
	-- ========================
	-- === multiple senders ===
	-- ========================

	-- sent by robots we don't control (mixed team challenge)
	allyFlag = "flag",

	-- sent by all attackers
	attackerFlag = "flag",

	-- sent by t/duel to make sure that the opponent duelist does not get marked as well
	defendedOpponent = Robot,

	-- sent by all defenders
	defenderFlag = "flag",

	-- sent by various tasks to notify other robots about their future positioning
	moveDest = "vector",

	-- sent by strikers to the MA to propose a possible pass
	-- requests that the ball is at msg.ballPos when the time reaches msg.time
	passSuggestion = { ballPos = "vector", time = "number", anonymous = "boolean", chip = "boolean", manual = "boolean" },

	-- sent by various behaviors which want to change the pool
	-- the string can be "attacker" or "defender"
	poolChangeRequest = "string",

	-- sent by all strikers
	strikerFlag = "flag",

	-- sent by t/striker to tell all other strikers about the currency of the sampled pass position
	strikerSamplingTimestamp = "number",


	-- =====================
	-- === single sender ===
	-- =====================

	-- sent by the MA to tell other attackers about the origin of the next shot
	attackPosition = "vector",

	-- sent by the MA to tell other attackers about the time of the next shot
	attackTime = "number",

	-- sent by gr/centerback to assign a target and a position to the centerback tasks
	-- target can be any table (preferably a ball-like or robot-like object)
	centerBackPosTarget = { pos = "vector", target = "table", way = "number" },

	-- sent by gr/moves to the participating agents
	-- params is a list of parameters
	moveAssignment = { behavior = "class", class = "class", params = "table", restart = "boolean", mainAttacker = "boolean" },

	-- sent by gr/moves to tr/attackratio to overwrite the number of attackers
	moveNumAttackers = "number",

	-- sent by the MA to notify all agents about an upcoming pass
	-- when the ball is actually shot, there should only be one entry in the table
	-- this is needed to choose the correct mainAttacker
	-- the ball is at msg.ballPos when the time reaches msg.time
	-- table is of entries of the format: { target = Robot, ballPos = "vector", time = "number" }
	passInfo = "table",

	-- sent by tr/defense to assign a behavior to each defender
	-- possible names are "CenterBack", "ManMark" and "ZoneDefense"
	-- params is a list of parameters
		-- Centerback:
			-- params[1]: Table target, a ball-like or robot-like structure
		-- ManMark:
			-- params[1]: Robot manMarkTarget
		-- ZoneDefense
			-- params[1]: Vector movePos
	roleAssignment = { name = "string", params = "table" },

	-- sent by the MA to tell other attackers about the destination of the next shot
	shootDestination = "vector",

	-- sent by gr/striker to assign zones to the striker tasks
	-- msg.boundaries = { left: number, right: number }
	strikerZone = { defaultPos = "vector", boundaries = "table" },

	-- sent by gr/midfield to assign zones to the midfield tasks
	-- msg.boundaries = { left: number, right: number }
	midfieldZone = { defaultPos = "vector", boundaries = "table" },
}


local exclusiveRoles = {
	mainAttacker = "number",
	duelAssistant = "number",
}
for role, _ in pairs(exclusiveRoles) do
	msgDefs[role] = Robot
end


local repeatedMessages = {
	-- sent by agents that want to apply for an exclusive role
	-- the list of exclusive roles is defined below
	-- format: msg.<role>: number
	exclusiveRole = "table",

	-- sent by gr/moves to make sure that unassigned robots become defenders
	forcePoolChange = { robot = Robot, destPool = "string" },

	-- sent by agents that want to join a specific group
	-- the list of groups is defined in tr/groups
	groupApplication = { name = "string", payload = "table" },
}

for msg, msgType in pairs(repeatedMessages) do
	msgDefs[msg] = msgType
end


-- extract types of typed tuples
local msgDefsTypedTuple = {}
for msg, msgType in pairs(msgDefs) do
	if type(msgType) == "table" and not Class.toClass(msgType, true) then
		msgDefsTypedTuple[msg] = msgType
		msgDefs[msg] = "table"
	end
end


local empty = {}
setmetatable(empty, { __newindex = function()
	error("this table is supposed to be empty")
end })

local function typedTuple(description)
	return setmetatable({}, {
		__index = function(_table, key)
			if not description[key] then
				error("Trying to read invalid key "..tostring(key))
			end
		end,
		__newindex = function(table, key, value)
			if not description[key] then
				error("Trying to write invalid key "..tostring(key))
			end
			checkType(value, description[key])
			rawset(table, key, value)
		end,
	})
end

local function convertToTypedTuple(value, description)
	local tuple = typedTuple(description)
	for k, v in pairs(value) do
		tuple[k] = v
	end
	return tuple
end


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

-- to work properly this requires LUA 5.2, in luajit this needs to be explicitely enabled an then recompiled
local messageMT = {
	__pairs = function(messageTable)
		local function pairs_it(t, lastRobot)
			local minRobot = nil
			local minID = 17
			for robot, _ in next, t do
				if robot.id < minID and robot.id > lastRobot.id then
					minRobot = robot
					minID = robot.id
				end
			end
			return minRobot, minRobot and t[minRobot]
		end
		return pairs_it, messageTable, {id = -1}
	end
}

local function makeSortedPairsTable(messages)
	local index = next(messages)
	if index and index ~= "trainer" then
		setmetatable(messages, messageMT)
	end
	return messages
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
				return makeSortedPairsTable(mtypeBox.all)
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

				return makeSortedPairsTable(receiveBox)
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
				if msgDefsTypedTuple[messageType] then
					data = convertToTypedTuple(data, msgDefsTypedTuple[messageType])
				end
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
