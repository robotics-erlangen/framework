local Base = (require "../base/class").new("Behavior.Base")

local Class = require "../base/class"
local Messaging = require "control/messaging"
local World = require "../base/world"
local Robot = require "observer/robot"
local Rating = require "util/rating"
local Referee = require "util/referee"

function Base:init(agent)
	self._agent = agent
	self._robot = self._agent:robot()
	self._inbox = Messaging.getInbox(self._agent)
	self._send = Messaging.getSender(self._agent)
	self:stop()
end

-- is called when another behavior is being chosen
function Base:stop()
	self._task = nil -- reset task
	self._active = false
	self._forceKeepingInPool = false
	self:_stop()
end

function Base:run()
	local bestTask, parameters = self:_updateTask()
	if not self._task or not Class.instanceOf(self._task, bestTask) then
		if parameters then
			self._task = bestTask.create(self._agent, unpack(parameters))
		else
			self._task = bestTask.create(self._agent)
		end
		self._agent:setTask(self._task)
	end
	self._task:run()
	self._active = true
end

-- is called on every run, if no higher prioritized behavior is chosen
-- return true if behavior is appropriate
function Base:check()
	error("stub")
end

function Base:forceKeepingInPool()
	return self._forceKeepingInPool
end

function Base:task()
	return self._task
end

function Base:robot()
	return self._robot
end

-- chooses and returns a task and its parameters
function Base:_updateTask()
	error("stub")
end

function Base:_applyForMainAttacker()
	local timeToBall = Robot.minTimeToBall(self._robot, World.Ball)
	local mainAttackerRating = Rating.timeToRating(timeToBall)
	self._send("trainer").specialRole({mainAttacker = mainAttackerRating})
end

function Base:_applyForCenterBack()
	local rating = math.min(0, World.Geometry.FieldWidthHalf - math.abs(self._robot.pos.x)) 
		/ World.Geometry.FieldWidthHalf
	rating = rating / 7 -- low probability of change
	self._send("trainer").specialRole({centerBack = rating})
end

-- can be overwritten for custom cleanups
function Base:_stop()
end

return Base
