-- Singleton module used by agents, behaviors, tasks and the trainer

local Robot = require "../base/robot"
local checkType = require "../base/typecheck"

local msgDefs = {
	-- multiple senders
	attackerFlag = "flag",
	centerbackFlag = "flag",
	defendedOpponent = Robot,
	moveDest = "userdata",
	moveDestDir = "number",
	distractedIndex = "number",
	exclusiveRole = "table", -- value test is in getExclusiveRoleApplications
	kickoffMirrorSide = "boolean",

	-- single sender
	aggressiveKeeperPos = "userdata",
	shootDestination = "userdata",
	passPos = "userdata", -- where the pass in the run is shot
	passSender = "string", -- type of pass (direct/in the run)
	duelAssistantPos = "userdata",
	duelAssistantDir = "number",
	roleAssignment = "table",
}

local exclusiveRoles = {
	passReceiver = true,
	mainAttacker = true,
	freeKickDefender = true,
	navChallengeRight = true,
	navChallengeLeft = true
}
for role, _ in pairs(exclusiveRoles) do
	msgDefs[role] = Robot
end

-- a message is a table of the form
-- { from: agent, mtype: testmessage, data: testtable, priority: 2 }
-- from can also be the string "trainer"
-- priority is optional and used by the tasks to filter out messages from tasks with lower priority
local newMessages = { trainer = {}, all = {} } -- table which is reset every frame with agent as key, array of messages as value
local deliveredMessages = nil -- reference to the newMessages table of the last last frame
local robotToAgent = {} -- track registered agents
local taskDuringSending = {}

local Messaging = {}

function Messaging.registerAgent(agent)
	robotToAgent[agent:robot()] = agent
end

--- This Method has to be called before any agents run
--- makes newMessages to deliveredMessages and creates a new newMessages table
function Messaging.deliverMessages()
	deliveredMessages = newMessages
	newMessages = { trainer = {}, all = {} }
	for _, agent in pairs(robotToAgent) do
		newMessages[agent] = {}
	end
end

--- supplies agent-specific inbox
-- @param agent Agent - agent of the task or behavior
-- @param priority number - when set, filters messages for higher priority by default
function Messaging.getInbox(agent, priority)
	if not priority then
		priority = 0
	end
	local inbox = {}
	for messageType, _ in pairs(msgDefs) do
		inbox[messageType] = function(request)
			if request and (request ~= "ignorePriority" and request ~= "all") then
				error "invalid request parameter"
			end
			local inboxMessages = {}
			if not deliveredMessages[agent] then -- agent wasn't there in last frame
				return inboxMessages
			end
			for _, msg in ipairs(deliveredMessages[agent]) do
				if msg.mtype == messageType then
					if msg.from == "trainer" then
						inboxMessages[msg.from] = msg.data
					elseif request == "all"
						or ((request == "ignorePriority" or priority == 0) and msg.from ~= agent)
						or (msg.priority > priority or (msg.priority == priority and msg.from:robot().id > agent:robot().id))
					then
						if taskDuringSending[msg.from] == msg.from:task() then
							inboxMessages[msg.from:robot()] = msg.data
						end
					end
				end
			end
			return inboxMessages
		end
	end	
	return inbox
end

--- supplies agent-specific sender object
-- @param agent Agent - agent of the task or behavior
-- @param priority number - is set as priority in every message
function Messaging.getSender(agent, priority)
	if not robotToAgent[agent:robot()] == agent then
		error("Agent is not registered for this robot!")
	end
	if not priority then
		priority = 0
	end
	-- although a sender is adressing a robot, a message is delivered 
	-- to the corresponding agent. This ensures that a robot only receives
	-- messages sent in frames where he has had the current agent
	local sender = function(receiver)
		local methods = {}
		for messageType, requestedType in pairs(msgDefs) do
			methods[messageType] = function(data, ...)
				if requestedType == "flag" and data then
					error("flag messages take no arguments")
				elseif select('#', ...) > 0 then
					error("too many arguments for sender function")
					checkType(data, requestedType)
				end
				local msg = {
					from = agent,
					mtype = messageType,
					data = requestedType == "flag" and true or data,
					priority = priority
				}
				taskDuringSending[agent] = agent:task()
				if receiver == "all" then
					for _, mailbox in pairs(newMessages) do
						table.insert(mailbox, msg)
					end
				elseif receiver == "trainer" then
					table.insert(newMessages.trainer, msg)
				elseif robotToAgent[receiver] then
					if not newMessages[robotToAgent[receiver]] then
						error("False usage of messaging module: deliverMessages() was not run between registerAgent() and a the call of this sender")
					end
					table.insert(newMessages[robotToAgent[receiver]], msg)
				else
					error("invalid message receiver \""..(receiver or "nil").."\"")
				end
			end
		end
		return methods
	end
	return sender
end

--- returns all messages of "messageType" which were sent to "all"
function Messaging.get(messageType)
	if not msgDefs[messageType] then
		error("request for invalid message type " .. messageType)
	end
	local messages = {}
	for _, msg in ipairs(deliveredMessages.all) do
		if msg.mtype == messageType then
			if msg.from == "trainer" then
				messages[msg.from] = msg.data
			else
				messages[msg.from:robot()] = msg.data
			end
		end
	end
	return messages
end

--- returns all messages of "messageType" which were sent to "all"
-- these are taken directly from "newMessages" before they get delivered
function Messaging.trainerGet(messageType)
	if not msgDefs[messageType] then
		error("request for invalid message type " .. messageType)
	end
	local messages = {}
	for _, msg in ipairs(newMessages.all) do
		if msg.mtype == messageType then
			if msg.from == "trainer" then
				messages[msg.from] = msg.data
			else
				messages[msg.from:robot()] = msg.data
			end
		end
	end
	return messages
end

--- supplies the trainer with exclusiveRole applications
-- @return table - role as key and a table as value which has a robot as key and a rating as value
function Messaging.getExclusiveRoleApplications()
	local applications = {}
	for _, msg in ipairs(newMessages.trainer) do
		if msg.mtype == "exclusiveRole" then
			for role, rating in pairs(msg.data) do
				if not exclusiveRoles[role] then
					error(role.." is not a valid exclusiveRole!")
				end
				if not applications[role] then
					applications[role] = {}
				end
				applications[role][msg.from:robot()] = rating
			end
		end
	end
	return applications
end

--- used by the trainer to send his choice for a special role
function Messaging.sendExclusiveRole(roleName, robot)
	for _, mailbox in pairs(newMessages) do
		table.insert(mailbox, {
			from = "trainer",
			mtype = roleName,
			data = robot,
			priority = 0
		})
	end
end

--- used by the trainer to assign roles (e.g. manmark)
function Messaging.assignRole(robot, roleName, params)
	 -- only possible if agent was registered in the previous frame
	if newMessages[robotToAgent[robot]] then
		table.insert(newMessages[robotToAgent[robot]], {
			from = "trainer",
			mtype = "roleAssignment",
			data = { name = roleName, params = params },
			priority = 0
		})
	end
end

return Messaging
