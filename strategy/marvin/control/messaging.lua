-- Singleton module used by agents, behaviors, tasks and the trainer
--
-- a message is a table of the form 
-- { from: robot, to: robot, mtype: testmessage, data: testtable, priority: 2 }
-- from can also be the string "trainer", to can also be "trainer" and "all"
-- priority is optional and used by the tasks to filter out messages from tasks with lower priority
--
-- although a sender is adressing a robot, a message is delivered to the corresponding agent
-- this ensures that a robot only receives messages sent in frames where he has had the current agent

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

local deliveredMessages = {}
local newMessages = {}
local robotToAgent = {} -- track registered agents

local Messaging = {}

--- sorts messages per agent into deliveredMessages
function Messaging.deliverMessages()
	deliveredMessages = { } -- clear last frame
	for _, agent in pairs(robotToAgent) do
		deliveredMessages[agent] = {}
	end
	for _, msg in ipairs(newMessages) do
		if msg.to == "all" then
			for _, mailbox in pairs(deliveredMessages) do
				table.insert(mailbox, msg)
			end
		elseif deliveredMessages[robotToAgent[msg.to]] then
			table.insert(deliveredMessages[robotToAgent[msg.to]], msg)
		elseif msg.to ~= "trainer" then
			error("invalid message receiver " .. (msg.to or "nil"))
		end
	end
	newMessages = {} -- reset for next frame
end

function Messaging.registerAgent(agent)
	robotToAgent[agent:robot()] = agent
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
	if not priority then
		priority = 0
	end
	local sender = function(receiver)
		local methods = {}
		for message, datatype in pairs(msgDefs) do
			methods[message] = function(data, ...)
				if select('#', ...) > 0 then
					error("too many arguments for sender function")
				end
				checkType(data, datatype)
				if not (robotToAgent[receiver] or receiver == "trainer" or receiver == "all") then
					error("invalid message target ("..(receiver or "nil")..")")
				end
				local msg = {from=agent:robot(), to=receiver, mtype=message, data=data, priority=priority}
				table.insert(newMessages, msg)
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
	for _, msg in ipairs(newMessages) do
		if msg.mtype == "specialRole" and msg.to == "trainer" then
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
	table.insert(newMessages, {
		from = "trainer",
		to = "all",
		mtype = roleName,
		data = robot,
		priority = 0
	})
end

return Messaging
