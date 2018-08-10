let Messaging = Class("Control.Messaging")

let Robot = require "../base/robot"
let checkType = require "../base/typecheck"


let msgDefs = {
	// ========================
	// === multiple senders ===
	// ========================

	// sent by robots we don't control (mixed team challenge)
	allyFlag = "flag",

	// sent by all attackers
	attackerFlag = "flag",

	// sent by t/duel to make sure that the opponent duelist does not get marked as well
	defendedOpponent = Robot,

	// sent by all defenders
	defenderFlag = "flag",

	// sent by various tasks to notify other robots about their future positioning
	moveDest = "vector",

	// sent by strikers to the MA to propose a possible pass
	// requests that the ball is at msg.ballPos when the time reaches msg.time
	passSuggestion = { ballPos = "vector", time = "number", anonymous = "boolean", chip = "boolean", manual = "boolean" },

	// sent by various behaviors which want to change the pool
	// the string can be "attacker" or "defender"
	poolChangeRequest = "string",

	// sent by all strikers
	strikerFlag = "flag",

	// sent by t/striker to tell all other strikers about the currency of the sampled pass position
	strikerSamplingTimestamp = "number",


	// =====================
	// === single sender ===
	// =====================

	// sent by the MA to tell other attackers about the origin of the next shot
	attackPosition = "vector",

	// sent by the MA to tell other attackers about the time of the next shot
	attackTime = "number",

	// sent by gr/centerback to assign a target and a position to the centerback tasks
	// target can be any table (preferably a ball-like or robot-like object)
	// time is relativ time until the target should be reached
	centerBackPosTarget = { pos = "vector", target = "table", way = "number", time = "number" },

	// sent by gr/moves to the participating agents
	// params is a list of parameters
	moveAssignment = { behavior = "class", class = "class", params = "table", restart = "boolean", mainAttacker = "boolean" },

	// sent by gr/moves to tr/attackratio to overwrite the number of attackers
	moveNumAttackers = "number",

	// sent by the MA to notify all agents about an upcoming pass
	// when the ball is actually shot, there should only be one entry in the table
	// this is needed to choose the correct mainAttacker
	// the ball is at msg.ballPos when the time reaches msg.time
	// table is of entries of the format: { target = Robot, ballPos = "vector", time = "number" }
	passInfo = "table",

	// sent by tr/defense to assign a behavior to each defender
	// possible names are "CenterBack", "ManMark" and "ZoneDefense"
	// params is a list of parameters
		// Centerback:
			// params[1]: Table, target like {pos= Vector, dir=Vector, time = number}
		// ManMark:
			// params[1]: Robot manMarkTarget
		// ZoneDefense
			// params[1]: Vector movePos
	roleAssignment = { name = "string", params = "table" },

	// sent by the MA to tell other attackers about the destination of the next shot
	shootDestination = "vector",

	// sent by gr/striker to assign zones to the striker tasks
	// msg.boundaries = { left: number, right: number }
	strikerZone = { defaultPos = "vector", boundaries = "table" },

	// sent by gr/midfield to assign zones to the midfield tasks
	// msg.boundaries = { left: number, right: number }
	midfieldZone = { defaultPos = "vector", boundaries = "table" },
}


let exclusiveRoles = {
	mainAttacker = "number",
	duelAssistant = "number",
	interceptPass = "number",
}
for (role, _ in pairs(exclusiveRoles)) {
	msgDefs[role] = Robot
}


let repeatedMessages = {
	// sent by agents that want to apply for an exclusive role
	// the list of exclusive roles is defined below
	// format: msg.<role>: number
	exclusiveRole = "table",

	// sent by gr/moves to make sure that unassigned robots become defenders
	forcePoolChange = { robot = Robot, destPool = "string" },

	// sent by agents that want to join a specific group
	// the list of groups is defined in tr/groups
	groupApplication = { name = "string", payload = "table" },
}

for (msg, msgType in pairs(repeatedMessages)) {
	msgDefs[msg] = msgType
}


// extract types of typed tuples
let msgDefsTypedTuple = {}
for (msg, msgType in pairs(msgDefs)) {
	if (type(msgType) == "table"  &&  not Class.toClass(msgType, true)) {
		msgDefsTypedTuple[msg] = msgType
		msgDefs[msg] = "table"
	}
}


let empty = {}
setmetatable(empty, { __newindex = function()
	error("this table is supposed to be empty")
end })

let typedTuple = function (description) {
	return setmetatable({}, {
		__index = function(_table, key)
			if (not description[key]) {
				error("Trying to read invalid key "..String(key))
			}
		end,
		__newindex = function(table, key, value)
			if (not description[key]) {
				error("Trying to write invalid key "..String(key))
			}
			checkType(value, description[key])
			rawset(table, key, value)
		end,
	})
}

let convertToTypedTuple = function (value, description) {
	let tuple = typedTuple(description)
	for (k, v in pairs(value)) {
		tuple[k] = v
	}
	return tuple
}


function Messaging:init () {
	self._newMessages = {} // is reset every frame
	self._deliveredMessages = {} // reference to the newMessages table of the last last frame
	// messages are stored in the following format:
	// messages = {
	// 	messageTypeA = {
	// 		Agent1 = { senderRobot1 = data, senderRobot2 = data}, ...
	// 	},
	// 	messageTypeB = { Agent3 = { senderRobot4 = data} }
	// }
	self._robotToAgent = {} // track registered agents
	self._trainerRegistered = false
}

function Messaging:registerAgent (agent) {
	self._robotToAgent[agent:robot()] = agent
	return self:_constructSender(agent), self:_constructInbox(agent)
}

function Messaging:registerTrainer () {
	assert(not self._trainerRegistered, "trainer is already registered!")
	self._trainerRegistered = true
	return self:_constructSender("trainer"), self:_constructInbox("trainer")
}

// this method should be called once every frame
function Messaging:deliverMessages () {
	self._deliveredMessages = self._newMessages
	self._newMessages = {}
}

// to work properly this requires LUA 5.2, in luajit this needs to be explicitely enabled an then recompiled
let messageMT = {
	__pairs = function(messageTable)
		let pairs_it = function (t, lastRobot) {
			let minRobot = nil
			let minID = 17
			for (robot, _ in next, t) {
				if (robot.id < minID  &&  robot.id > lastRobot.id) {
					minRobot = robot
					minID = robot.id
				}
			}
			return minRobot, minRobot  &&  t[minRobot]
		}
		return pairs_it, messageTable, {id = -1}
	}
}

let makeSortedPairsTable = function (messages) {
	let index = next(messages)
	if (index  &&  index != "trainer") {
		setmetatable(messages, messageMT)
	}
	return messages
}

function Messaging:_constructInbox (receiver) {
	let inbox = {}
	for (messageType, _ in pairs(msgDefs)) {
		inbox[messageType] = function(mode)
			let mtypeBox = self._deliveredMessages[messageType]
			if (receiver == "trainer") {
				mtypeBox = self._newMessages[messageType]
			}
			if (not mtypeBox) {
				return empty
			}
			// returns all messages of "messageType" which were sent to "all"
			if (mode == "broadcast") {
				if (not mtypeBox.all) {
					return empty
				}
				return makeSortedPairsTable(mtypeBox.all)
			} else if (mode != nil) {
				error("Invalid request mode only nil  ||  \"broadcast\" is allowed")
			}
			let receiveBox = mtypeBox[receiver]
			let allBox = mtypeBox.all
			if (not receiveBox  &&  not allBox) {
				return empty
			} else {
				if (not receiveBox) {
					receiveBox = {}
					mtypeBox[receiver] = receiveBox
				}
				if (allBox) {
					let allMerged = mtypeBox.allBoxMerged
					if (not allMerged) {
						allMerged = {}
						mtypeBox.allBoxMerged = allMerged
					}
					if (not allMerged[receiver]) { // merge broadcasts into receiveBox
						let receiverRobot = (receiver == "trainer") ? "trainer" : receiver:robot()
						for (sender, data in pairs(allBox)) {
							if (sender != receiverRobot  ||  sender == "trainer") {
								receiveBox[sender] = data
							}
						}
						allMerged[receiver] = true
					}
				}

				return makeSortedPairsTable(receiveBox)
			}
		}
	}
	return inbox
}

function Messaging:_constructSender (sender) {
	let sendObj = {}
	for (messageType, requiredType in pairs(msgDefs)) {
		sendObj[messageType] = function(receiver, data)
			// although a sender is adressing a robot, a message is delivered
			// to the corresponding agent. This ensures that a robot only receives
			// messages sent in frames where he has had the current agent
			if (receiver == nil) {
				error("nil is not a valid receiver")
			} else if (receiver != "all"  &&  receiver != "trainer") {
				receiver = self._robotToAgent[receiver]
				if (not receiver) {
					return // not registered yet
				}
			}
			if (requiredType == "flag") {
				if (data) {
					error("flag messages take no arguments")
				} else {
					data = true
				}
			} else {
				checkType(data, requiredType)
				if (msgDefsTypedTuple[messageType]) {
					data = convertToTypedTuple(data, msgDefsTypedTuple[messageType])
				}
			}
			let mtypeBox = self._newMessages[messageType]
			if (not mtypeBox) {
				mtypeBox = {}
				self._newMessages[messageType] = mtypeBox
			}
			let receiveBox = mtypeBox[receiver]
			if (not receiveBox) {
				receiveBox = {}
				mtypeBox[receiver] = receiveBox
			}
			let senderRobot = (sender == "trainer") ? "trainer" : sender:robot()

			if (repeatedMessages[messageType]) {
				let collection = receiveBox[senderRobot]
				if (not collection) {
					collection = {}
				}
				table.insert(collection, data)
				receiveBox[senderRobot] = collection
			} else {
				receiveBox[senderRobot] = data
			}
		}
	}
	return sendObj
}


return Messaging
