local World = require "../base/world"
local debug = require "../base/debug"

local msgDefs = {
	-- multiple senders
	assistantRating = "number",
	defendedOpponent = "table", --FIXME check for Robot class
	moveDest = "userdata",
	moveDestDir = "number",
	distractedIndex = "number",
	specialRole = "table", -- trainer tests for valid role

	-- single sender
	aggressiveKeeperPos = "userdata",
	passPos = "userdata", -- where the pass in the run is shot
	passSender = "string", -- type of pass (direct/in the run)
	duelAssistantPos = "userdata",
	duelAssistantDir = "number",
}

local specialRoles = { 
	-- order is priority!
	"passReceiver",
	"mainAttacker",
	"freeKickDefender"
}

-- specialRoles, only being sent by trainer
for _, role in ipairs(specialRoles) do
	msgDefs[role] = "table" --FIXME check for Robot class
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
		else
			table.insert(mailboxes[msg.to], msg)
		end
	end

	return mailboxes
end

--- supplies agent with message methods
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
--@param agent - the agent to supply
function Messaging.getSender(agent)
	local sender = function (receiver)
		local methods = {}
		for message, datatype in pairs(msgDefs) do
			methods[message] = function(data)
				if type(data) ~= datatype then
					error("Datatype for "..message.." message is "..type(data)
						.." instead of "..datatype.."!")
				end
				local isNotFriendly = true
				for _, r in ipairs(World.FriendlyRobots) do
					if agent._robot == r then
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