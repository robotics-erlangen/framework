local SuggestPass = require "task/ability/suggestpass"
local Striker = Class("Task.Striker", require "task/base", SuggestPass)

local StrikerSampling = require "task/strikersampling"

local debug = require "../base/debug"
local Field = require "../base/field"
local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

local Physics = require "observer/physics"

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

local UtilAttack = require "util/attack"


-- the time between the arrival of the robot and the ball
local bufferTime = 0.4


function Striker:_init()
	self._moveDest = nil
	self._passDest = nil
	self._passDestSuggestion = nil
	self._acceptPass = false

	self._zone = nil

	self._sampling = StrikerSampling(self._agent)
	self._revaluateTimestamp = 0
end

function Striker:_revaluatePassDest()
	local timestamps = self._inbox.strikerSamplingTimestamp("broadcast")
	local nextCandidate = nil
	local nextCandidateTimestamp = math.huge
	for r, time in pairs(timestamps) do
		if not nextCandidate or time < nextCandidateTimestamp
				or time == nextCandidateTimestamp and r.id < nextCandidate.id then
			nextCandidate = r
			nextCandidateTimestamp = time
		end
	end

	local revaluate = self._robot == nextCandidate
	if revaluate then
		self._revaluateTimestamp = World.Time
	end

	self._send.strikerSamplingTimestamp("all", self._revaluateTimestamp)

	return revaluate
end

function Striker:_searchForPassDest()
	self._sampling:precalculate()

	local grid_point_count_x = 5
	local grid_point_count_y = 5

	local min_y = -G.FieldHeightHalf / 4

	local grid_point_dist_x = G.FieldWidth / grid_point_count_x
	local grid_point_dist_y = (G.FieldHeightHalf - min_y) / grid_point_count_y

	local boundaries = self._zone.boundaries
	local left = boundaries.left
	local right = boundaries.right

	-- TODO hysteresis
	-- TODO only consider well-timed pass positions
	-- TODO am strafraum stehen ist geil! -> score anpassen

	local bestPoint = nil
	local bestScore = -math.huge
	for x = grid_point_dist_x * 0.5 - G.FieldWidthHalf, G.FieldWidthHalf, grid_point_dist_x do
		if x > left and x < right then
			for y = grid_point_dist_y * 0.5 + min_y, G.FieldHeightHalf, grid_point_dist_y do
				local candidatePoint = Vector(x, y)
				if not Field.isInOpponentDefenseArea(candidatePoint, self._robot.radius + 0.03) then
					local score = self._sampling:evalLocation(candidatePoint)
					if self._passDest and self._passDest:distanceTo(candidatePoint) < 0.01 then
						score = score + 0.1
					end
					if score > bestScore then
						bestScore = score
						bestPoint = candidatePoint
					end
				end
			end
		end
	end

	self._passDestSuggestion = bestPoint
end

function Striker:_avoidLineSegment(startPoint, endPoint)
	self._robot.path:addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, 0.2)

	-- actively dodge a pass
	local pointOnLine = self._moveDest:nearestPosOnLine(startPoint, endPoint)
	local minDistToBall = self._robot.radius + World.Ball.radius + 0.1
	if self._moveDest:distanceTo(pointOnLine) < minDistToBall then
		self._moveDest = self._moveDest + (G.OpponentGoal - self._moveDest):setLength(minDistToBall)
	end
end

function Striker:run()
	-- participate in the striker group
	local groupApplication = { name = "striker", payload = 0 }
	self._send.groupApplication("trainer", groupApplication)

	-- retrieve the assigned zone from the striker group
	self._zone = self._inbox.strikerZone().trainer
	if not self._zone then
		return
	end

	-- search for a good pass dest
	if not self._acceptPass and self:_revaluatePassDest() then
		self:_searchForPassDest()
	end

	vis.addCircle("t/striker", self._zone.defaultPos, 0.1, vis.colors.slateHalf, true)
	if self._passDestSuggestion then
		vis.addCircle("t/striker", self._passDestSuggestion, 0.1, vis.colors.whiteHalf, true)
		vis.addPath("t/striker", {self._zone.defaultPos, self._passDestSuggestion},
			vis.colors.slateHalf, nil, nil, 0.02)
	end

	-- check whether the striker should change its state to accepting an incoming pass
	local _, passInfo = next(self._inbox.passInfo())
	self._passDest = passInfo and passInfo.pos or self._passDestSuggestion

	if passInfo and passInfo.target == self._robot then
		local robotTime = Physics.robotTimeToPos(self._robot, self._passDest, Vector(0, 0), true)

		-- TODO: never ever change back to default pos
		debug.set("robotTime", robotTime + bufferTime)
		debug.set("ballTime", passInfo.time - World.Time)
		debug.set("passInfoTime", passInfo.time)
		if World.Time + robotTime + bufferTime >= passInfo.time then
			self._acceptPass = true
		end
	else
		self._acceptPass = false
	end

	-- set the move dest accordingly
	debug.set("acceptPass", self._acceptPass)
	if self._acceptPass then
		self._moveDest = self._passDest
	else
		self._moveDest = self._zone.defaultPos
	end

	-- set path obstacles to not interfere with the current attack
	local moveTime = nil
	local _, attackPosition = next(self._inbox.attackPosition())
	if self._moveDest then
		PathHelper.setDefaultObstacles(self._robot.path, self._robot)
		PathHelper.addRobotObstacles(self._robot.path, self._robot)

		-- don't move between the ball and the main attacker
		-- relevant for incoming passes
		local mainAttacker = self._inbox.mainAttacker().trainer
		if mainAttacker then
			self:_avoidLineSegment(World.Ball.pos, mainAttacker.pos)
		end

		-- don't move between the ball and the pass target
		-- relevant for outgoing passes
		if passInfo and passInfo.target ~= self._robot then
			self:_avoidLineSegment(World.Ball.pos, self._passDest)
		end

		-- don't move between the ball and the opponent goal
		-- relevant for goal shots
		if not passInfo and attackPosition and UtilAttack.checkForGoalShot() then
			local ballPos = World.Ball.pos
			local leftGoal = G.OpponentGoalLeft
			local rightGoal = G.OpponentGoalRight
			self._robot.path:addTriangle(ballPos.x, ballPos.y, leftGoal.x, leftGoal.y,
				rightGoal.x, rightGoal.y, World.Ball.radius + 0.04)
		end

		local _, time = self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
		moveTime = time
	end

	-- send a suggestion for a pass in the run
	if self._passDestSuggestion and attackPosition then
		self:_suggestPass(self._passDestSuggestion, attackPosition, moveTime)
	end
end

return Striker