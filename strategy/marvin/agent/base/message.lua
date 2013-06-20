local Class = require "../base/class"

-- empty base class, required for automatically casting tables to messages
local MessageBase = (require "../base/class").new("Message.Base")

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

local GenericMessage, GenericMessageMt = (require "../base/class").new("Message.Generic", MessageBase)
-- tables with field name = value type
-- types can be string, number, table, userdata (Vector!) and classes
-- tables are automatically cast to messages where applicable
GenericMessage._required = {}
GenericMessage._optional = {}
-- default values are added after checking of required and optional fields
GenericMessage._default = {}

function GenericMessageMt.__newindex()
	error("A Message object is readonly!")
end

function GenericMessage:init(msg)
	if msg == nil then
		msg = {}
	end
	assert(type(msg) == "table", "Table expected!")
	for k,t in pairs(self._required) do
		if not msg[k] then
			error("Required field " .. k .. " is missing!")
		end
		self[k] = checkType(msg[k], t)
	end
	
	for k,t in pairs(self._optional) do
		if msg[k] then
			self[k] = checkType(msg[k], t)
		end
	end
	
	for k,v in pairs(self._default) do
		if not msg[k] then
			self[k] = v
		end
	end
	
	for k,v in pairs(msg) do
		if not self._required[k] and not self._optional[k] then
			error("Unknown field " .. k)
		end
	end
end

local KeyValueMessage, KeyValueMessageMt = (require "../base/class").new("Message.KeyValue", MessageBase)
-- just a message with key and values of fixed types
-- type of every key
KeyValueMessage._keyType = "number"
-- type of every value
KeyValueMessage._valueType = "number"

function KeyValueMessageMt.__newindex()
	error("A Message object is readonly!")
end

function KeyValueMessage:init(msg)
	if msg == nil then
		msg = {}
	end
	assert(type(msg) == "table", "Table expected!")
	for k,v in pairs(msg) do
		self[checkType(k, self._keyType)] = checkType(v, self._valueType)
	end
end


local Robot = require "../base/robot"
local TaskBase = require "task/base"

local AgentSpecialTask = (require "../base/class").new("Message.AgentSpecialTask", KeyValueMessage)
AgentSpecialTask._keyType = "string"
AgentSpecialTask._valueType = "number"

local Agent = (require "../base/class").new("Message.Agent", GenericMessage)
Agent._optional = {
	specialTask = AgentSpecialTask,
	targetPos = "userdata"
}

local Task = (require "../base/class").new("Message.Task", GenericMessage)
Task._optional = {
	assistantRating = "number",
	defendedOpponent = Robot,
	duelAssistantPos = "userdata",
	duelAssistantDir = "number",
	-- position where the ball will be shoot using the linear kicker
	shootPos = "userdata",
	passTarget = Robot, -- robot to pass to
	targetPos = "userdata",
	targetDir = "number",
	aggressiveKeeperPos = "userdata",
}

local Container = (require "../base/class").new("Message.Container", GenericMessage)
Container._optional = {
	agent = Agent,
	task = Task
}
Container._default = {
	agent = {},
	task = {}
}

local TrainerSpecialTask = (require "../base/class").new("Message.TrainerSpecialTask", KeyValueMessage)
TrainerSpecialTask._keyType = "string"
TrainerSpecialTask._valueType = Robot

local TrainerPlay = (require "../base/class").new("Message.TrainerPlay", KeyValueMessage)
TrainerPlay._keyType = Robot
TrainerPlay._valueType = TaskBase

local Trainer = (require "../base/class").new("Message.Trainer", GenericMessage)
Trainer._optional = {
	specialTask = TrainerSpecialTask,
	play = TrainerPlay
}

local Message = {
	Agent = Agent,
	Container = Container,
	Task = Task,
	Trainer = Trainer
}

return Message
