local Base = Class("Agent.Base.Agent")

local debug = require "../base/debug"
local Field = require "../base/field"
local timing = require "../base/timing"
local World = require "../base/world"
local Halt = require "agent/shared/halt"
local Error = require "agent/shared/error"
local Physics = require "observer/physics"
local CenterBack = require "task/centerback"
local Rating = require "util/rating"
local G = World.Geometry

local MEASURE_TIMING = false


-- static method for pool
function Base.takeRobot(_robots)
	error("stub")
end

function Base:init(robot, messaging)
	self._robot = robot
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
end

function Base:_run()
end

function Base:run()
	debug.pushtop(self._debugIdStr)
	debug.set(nil, Class.name(self, true))

	local task = self:_runBehavior()
	self:_dumpInbox()
	self:_runTask(task)
	self:_applyForMainAttacker(task)
	self:_run()

	debug.pop() -- Agent
end

function Base:_runBehavior()
	if MEASURE_TIMING then
		timing.start("Behavior check", self._robot.id)
	end

	-- choose best behavior, that is the behavior with the highest priority of all useable ones
	local bestBehavior = nil
	for _, behavior in ipairs(self._behaviors) do
		behavior:clearMainAttackerParameters()
		local result = behavior:check()
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

	if MEASURE_TIMING then
		timing.finish("Behavior check", self._robot.id)
		timing.start("Behavior run", self._robot.id)
	end

	-- run behavior
	if self._activeBehavior then
		debug.set("Behavior", Class.name(self._activeBehavior, true))
		self._activeBehavior:run()
	else
		debug.set("Behavior", "none")
	end

	if MEASURE_TIMING then
		timing.finish("Behavior run", self._robot.id)
	end

	return self._activeBehavior and self._activeBehavior:task()
end

function Base:_dumpInbox()
	debug.push("Inbox")
	for name, func in pairs(self._inbox) do
		debug.push(name)
		for sender, msg in pairs(func()) do
			if type(msg) == "table" and rawget(msg, "time") then
				local msgTmp = table.copy(msg)
				local relTime = tostring(msg.time - World.Time)
				msgTmp.time = string.sub(relTime, 1, 5) .. " (" .. msg.time .. ")"
				debug.set(sender.id or sender, msgTmp)
			else
				debug.set(sender.id or sender, msg)
			end
		end
		debug.pop() -- name
	end
	debug.pop() -- Inbox
end

function Base:_runTask(task)
	if MEASURE_TIMING then
		timing.start("Task", self._robot.id)
	end

	debug.push("Task")
	if task then
		task:clearMainAttackerParameters()
		task:run()
		debug.set(nil, Class.name(task, true))
	else
		debug.set(nil, "none")
	end
	debug.pop() -- Task

	if MEASURE_TIMING then
		timing.finish("Task", self._robot.id)
	end
end

function Base:_applyForMainAttacker(task)
	-- the keeper just overrides this
	local parameters = nil
	for _, behavior in ipairs(self._behaviors) do
		parameters = behavior:mainAttackerParameters() or parameters
		if behavior == self._activeBehavior then
			break
		end
	end
	local overrideRating = parameters and parameters[3]
	if parameters and task and not overrideRating then
		-- only use task parameters if behavior asked for main attacker application
		parameters = task:mainAttackerParameters() or parameters
	end
	if not parameters then
		self._mainAttackerLastTime = nil
		return
	end

	if self._robot ~= World.FriendlyKeeper and World.RefereeState ~= "BallPlacementOffensive" then
		-- only the keeper can apply for MA if it could touch the ball inside the defense area
		if Field.distanceToFriendlyDefenseArea(self._robot.pos, self._robot.radius) <= World.Ball.radius + 0.02 then
			return
		end

		-- only the keeper can apply for MA if the ball is behind the centerbacks
		if Field.distanceToFriendlyDefenseArea(World.Ball.pos, World.Ball.radius) <= CenterBack.distanceToDefenseArea() then
			return
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
		local mainAttacker = self._inbox.mainAttacker().trainer
		if mainAttacker then
			local ownAngle = G.OpponentGoal:absoluteAngleDiff(self._robot.pos-World.Ball.pos)
			local mainAttackerAngle = G.OpponentGoal:absoluteAngleDiff(mainAttacker.pos-World.Ball.pos)
			if ownAngle >= mainAttackerAngle then
				local relativeYPos = World.Ball.pos.y - self._robot.pos.y
				local ratingBoost = math.sin(math.bound(0, relativeYPos*math.pi, math.pi))
				mainAttackerRating = mainAttackerRating + ratingBoost * 0.2
			end
		end
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

function Base:robot()
	return self._robot
end

return Base
