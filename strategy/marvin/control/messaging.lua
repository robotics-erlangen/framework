-- Singleton module used by agents, behaviors, tasks and the trainer

local Robot = require "../base/robot"
local checkType = require "../base/typecheck"

local msgDefs = {
	-- multiple senders
	assistantRating = "number",
	defendedOpponent = Robot,
	moveDest = "userdata",
	moveDestDir = "number",
	distractedIndex = "number",
	specialRole = "table", -- value test is in getSpecialRoleApplications

	-- single sender
	aggressiveKeeperPos = "userdata",
	passPos = "userdata", -- where the pass in the run is shot
	passSender = "string", -- type of pass (direct/in the run)
	duelAssistantPos = "userdata",
	duelAssistantDir = "number",
}

local specialRoles = {
	passReceiver = true,
	mainAttacker = true,
	centerBack = true,
	freeKickDefender = true
}
for role, _ in pairs(specialRoles) do
	msgDefs[role] = Robot
end

-- a message is a table of the form 
-- { from: robot, mtype: testmessage, data: testtable, priority: 2 }
-- from can also be the string "trainer"
-- priority is optional and used by the tasks to filter out messages from tasks with lower priority
local newMessages = { trainer = {} } -- table which is reset every frame with agent as key, array of messages as value
local deliveredMessages = nil -- reference to the newMessages table of the last last frame
local robotToAgent = {} -- track registered agents

local Messaging = {}

function Messaging.registerAgent(agent)
	robotToAgent[agent:robot()] = agent
end

--- makes newMessages to deliveredMessages and creates a new newMessages table
function Messaging.deliverMessages()
	deliveredMessages = newMessages
	newMessages = { trainer = {} }
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
					if request == "all"
						or msg.from == "trainer"
						or ((request == "ignorePriority" or priority == 0) and msg.from ~= agent:robot())
						or (msg.priority > priority or (msg.priority == priority and msg.from.id > agent:robot().id))
						then

						inboxMessages[msg.from] = msg.data
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
				if select('#', ...) > 0 then
					error("too many arguments for sender function")
				end
				checkType(data, requestedType)
				local msg = {
					from = agent:robot(),
					mtype = messageType,
					data = data,
					priority = priority
				}
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

--- supplies the trainer with specialRole applications
-- @return table - role as key and a table as value which has a robot as key and a rating as value
function Messaging.getSpecialRoleApplications()
	local applications = {}
	for _, msg in ipairs(newMessages.trainer) do
		if msg.mtype == "specialRole" then
			for role, rating in pairs(msg.data) do
				if not specialRoles[role] then
					error(role.." is not a valid specialRole!")
				end
				if not applications[role] then
					applications[role] = {}
				end
				applications[role][msg.from] = rating
			end
		end
	end
	return applications
end

--- used by the trainer to send his choice for a special role
function Messaging.sendSpecialRole(roleName, robot)
	for _, mailbox in pairs(newMessages) do
		table.insert(mailbox, {
			from = "trainer",
			mtype = roleName,
			data = robot,
			priority = 0
		})
	end
end

return Messaging
