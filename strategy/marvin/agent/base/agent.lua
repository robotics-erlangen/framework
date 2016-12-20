local Base = Class("Agent.Base.Agent")

local debug = require "../base/debug"
local Field = require "../base/field"
local World = require "../base/world"
local Halt = require "agent/shared/halt"
local Error = require "agent/shared/error"
local Physics = require "observer/physics"
local CenterBack = require "task/centerback"
local Rating = require "util/rating"
-- local plot = require "../base/plot"


-- static method for pool
function Base.takeRobot(_robots)
	error("stub")
end

function Base:init(robot, messaging)
	self._robot = robot
	self._task = nil
	self._send, self._inbox = messaging:registerAgent(self)
	-- behaviors are ordered by decreasing priority
	self._behaviors = {
		Halt(self),
		Error(self),
		unpack(table.map(self._behaviors,
			function (B) return B(self) end)
		)
	}
	self._activeBehavior = nil
	self._mainAttackerParameters = nil
	self._mainAttackerLastTime = nil
	self._debugIdStr = "Agent " .. self._robot.id
	self.lastIncomingPassTime = 0
end

function Base:_run()
end

function Base:run()
	debug.pushtop(self._debugIdStr)
	debug.set(nil, Class.name(self, true))
	--local time0 = amun.getCurrentTime()

	self:_updateBehavior()
	self:_runTaskAndBehavior()
	self:_applyForMainAttacker()
	self:_run()

	--local time1 = amun.getCurrentTime()
	--plot.aggregate("Agent." .. Class.name(self, true), time1-time0)
	debug.pop() -- Agent
end

function Base:_updateBehavior()
	-- choose best behavior, that is the behavior with the highest priority of all useable ones
	local bestBehavior = nil
	for _, behavior in ipairs(self._behaviors) do
		behavior:clearMainAttackerParameters()
		--local time0 = amun.getCurrentTime()
		local result = behavior:check()
		--local time1 = amun.getCurrentTime()
		--plot.aggregate("Behavior." .. Class.name(behavior, true), time1-time0)
		if result then
			bestBehavior = behavior
			break
		end
	end
	-- check if the behavior has changed
	if bestBehavior ~= self._activeBehavior then
		if self._activeBehavior then
			self._activeBehavior:stop()
		end
		self._activeBehavior = bestBehavior
		if self._activeBehavior then
			self._activeBehavior:start()
		end
	end
end

function Base:_runTaskAndBehavior()
	if self._activeBehavior then
		debug.set("Behavior", Class.name(self._activeBehavior, true))
		self._activeBehavior:run()
	else
		debug.set("Behavior", "none")
	end
	debug.push("Inbox")
	for name, func in pairs(self._inbox) do
		debug.push(name)
		for sender, msg in pairs(func()) do
			if type(msg) == "table" and msg.time then
				msg.time = msg.time - World.Time
			end
			debug.set(sender.id or sender, msg)
		end
		debug.pop() -- name
	end
	debug.pop() -- Inbox
	debug.push("Task")
	if self._task then
		self._task:clearMainAttackerParameters()
		--local time0 = amun.getCurrentTime()
		self._task:run()
		--local time1 = amun.getCurrentTime()
		--plot.aggregate("Task." .. Class.name(self._task, true), time1-time0)
		debug.set(nil, Class.name(self._task, true))
	else
		debug.set(nil, "none")
	end
	debug.pop() -- Task
end

function Base:_applyForMainAttacker()
	-- the keeper just overrides this
	local parameters = nil
	for _, behavior in ipairs(self._behaviors) do
		parameters = behavior:mainAttackerParameters() or parameters
		if behavior == self._activeBehavior then
			break
		end
	end
	local overrideRating = parameters and parameters[3]
	if parameters and self._task and not overrideRating then
		-- only use task parameters if behavior asked for main attacker application
		parameters = self._task:mainAttackerParameters() or parameters
	end
	if not parameters then
		self._mainAttackerLastTime = nil
		return
	end

	if self._robot ~= World.FriendlyKeeper and World.RefereeState ~= "BallPlacementOffensive" then
		-- only the keeper can apply for MA if it could touch the ball inside the defense area
		if Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius) <= World.Ball.radius + 0.02 then
			return false
		end

		-- only the keeper can apply for MA if the ball is behind the centerbacks
		if Field.distanceToFriendlyDefenseArea(World.Ball.pos, World.Ball.radius) <= CenterBack.distanceToDefenseArea() then
			return false
		end
	end

	local mainAttackerRating
	if not overrideRating then
		local targetPos = parameters[1] or World.Geometry.OpponentGoal
		local endSpeedLength = parameters[2] or 0

		local timeToBall = Physics.robotTimeToBall(self._robot,
			World.Ball, targetPos, endSpeedLength, self._mainAttackerLastTime)
		self._mainAttackerLastTime = timeToBall

		-- if we have the ball, the time is 0
		if timeToBall == math.huge then
			local dribblerPos = self._robot.pos + Vector.fromAngle(self._robot.dir) * self._robot.shootRadius
			if World.Ball.pos:distanceTo(dribblerPos) < 0.15 then
				if World.Ball.speed:dot(self._robot.pos - World.Ball.pos) > 0 then
					timeToBall = 0
				end
			end
		end

		if timeToBall == math.huge then
			local ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed)
			if math.abs(ballOutPos.x) > World.Geometry.DefenseStretch / 2  + World.Geometry.DefenseRadius then
				timeToBall = Physics.robotTimeToPos(self._robot, ballOutPos, Vector(0, 0))
			end
		end
		mainAttackerRating = Rating.timeToRating(timeToBall)

		-- rate the robot pos (generally, being behind the ball is better)
		local relativeYPos = World.Ball.pos.y - self._robot.pos.y
		local ratingBoost = math.sin(math.bound(0, relativeYPos*math.pi, math.pi))
		mainAttackerRating = mainAttackerRating + ratingBoost * 0.2
	else
		mainAttackerRating = overrideRating
	end

	self._send.exclusiveRole("trainer", {mainAttacker = mainAttackerRating})
end

-- controls whether the robot may be kept in its pool
function Base:keepRobot()
	error("stub")
end

-- rate robot for deciding which robots to keep in the pool
-- the robots with the lowest rating are removed until the robot limit is satisfied
function Base:rateRobot()
	error("stub")
end

function Base:setTask(task)
	self._task = task
end

function Base:task()
	return self._task
end

function Base:robot()
	return self._robot
end

return Base
