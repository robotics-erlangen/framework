local World = require "../base/world"
local debug = require "../base/debug"
local Class = require "../base/class"
local Robot = require "../base/robot"

local function checkType(value, requestedType)
	local tval = type(value)
	if type(requestedType) == "string" then
		if tval ~= requestedType then
			error("Expected type " .. requestedType .. " got " .. tval)
		end
	elseif type(requestedType) == "table" and Class.toClass(requestedType, true) then
		if tval ~= "table" then
			error("Expected class "..Class.name(requestedType).. " got type " .. tval)
		end
		if not Class.toClass(value, true) then
			if Class.instanceOf(requestedType, MessageBase) then
				value = requestedType.create(value)
			else
				error("Expected class "..Class.name(requestedType).. " got type " .. tval)
			end
		end
		if not Class.instanceOf(value, requestedType) then
				error("Expected class "..Class.name(requestedType).." got class "..Class.name(value))
		end
	else
		error("Can't handle requestedType")
	end
	return value
end


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
	"passReceiver",
	"mainAttacker",
	"freeKickDefender"
}

-- specialRoles, only being sent by trainer
for _, role in ipairs(specialRoles) do
	msgDefs[role] = Robot
end

local Messaging = {}

--- sorts messages into per-robot mailboxes
function Messaging.sortMail(messages)
	local mailboxes = { trainer = {} }
	for _, robot in ipairs(World.FriendlyRobots) do
		mailboxes[robot] = {}
	end

	for _, msg in ipairs(messages) do
		if msg.to == "all" then
			for _, box in pairs(mailboxes) do
				table.insert(box, msg)
			end
		elseif mailboxes[msg.to] then -- receiver has to be in FriendlyRobots
			table.insert(mailboxes[msg.to], msg)
		end
	end

	return mailboxes
end

--- supplies agent with message methods
-- @param agent Agent - the agent to supply
function Messaging.getInbox(agent)
	local inbox = {}
	for messageType, _ in pairs(msgDefs) do
		inbox[messageType] = function(filter)
			local messages = {}
			for _, msg in ipairs(agent.inboxRaw) do
				if msg.mtype == messageType then
					messages[msg.from] = msg.data
				end
			end

			if filter == "others" then
				messages[agent._robot] = nil
			elseif type(filter) == "function" then
				filter(messages)
			elseif not filter then
				-- ok
			else
				error("invalid filter for inbox function")
			end

			return messages
		end
	end
	return inbox
end

--- supplies sender object for an agent and thereby to his behavior and task
-- @param agent Agent - the agent to supply
function Messaging.getSender(agent)
	local sender = function (receiver)
		local methods = {}
		for message, datatype in pairs(msgDefs) do
			methods[message] = function(data, ...)
				if arg.n > 0 then
					error("to many arguments for sender function")
				end
				checkType(data, datatype)
				local isNotFriendly = true
				for _, r in ipairs(World.FriendlyRobots) do
					if receiver == r then
						isNotFriendly = false
						break
					end
				end
				if receiver ~= "all" and receiver ~= "trainer" and isNotFriendly then
					error("invalid message target ("..(receiver or "nil")..")")
				end
				local msg = {from=agent._robot, to=receiver, mtype=message, data=data}

				table.insert(agent.outbox, msg)
			end
		end
		return methods
	end
	return sender
end

--- supplies the coordinator with specailRole applications
-- @param messages msg[] - the messages to filter for specialRole applications
-- @return table - role as key and a table as value which has a robot as key and a rating as value
function Messaging.getSpecialRoleApplications(messages)
	local applications = {}
	for _, msg in ipairs(messages) do
		if msg.mtype == "specialRole" then
			for role, rating in pairs(msg.data) do
				if not table.any(specialRoles, function(r) return r==role end) then
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

return Messaging