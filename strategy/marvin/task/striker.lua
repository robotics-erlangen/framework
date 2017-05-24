local SuggestPass = require "task/ability/suggestpass"
local Striker = Class("Task.Striker", require "task/base", SuggestPass)

local StrikerSampling = require "task/strikersampling"

local Field = require "../base/field"
local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"

local Attack = require "util/attack"



function Striker:_init(manualDefaultPos, manualPassDest)
	self._manualDefaultPos = manualDefaultPos
	self._manualPassDest = manualPassDest
	self._passDestSuggestion = manualPassDest

	self._moveDest = nil

	self._zone = nil

	self._sampling = StrikerSampling(self._agent)
	self._revaluateTimestamp = 0
end

function Striker:_revaluatePassDest()
	if self._manualPassDest then
		return false
	end

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

	local min_y = 0 -- -G.FieldHeightHalf / 4

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
					local score = self._sampling:evalLocation(candidatePoint, bestScore)
					local _, passInfoTable = next(self._inbox.passInfo())
					if passInfoTable then
						for _, passInfo in pairs(passInfoTable) do
							if passInfo.ballPos:distanceTo(candidatePoint) < 0.01 then
								score = score + 0.1
							end
						end
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
	local defaultPos

	if self._manualDefaultPos then
		defaultPos = self._manualDefaultPos
	else
		-- participate in the striker group
		local groupApplication = { name = "striker", payload = {} }
		self._send.groupApplication("trainer", groupApplication)

		-- retrieve the assigned zone from the striker group
		self._zone = self._inbox.strikerZone().trainer
		if not self._zone then
			return
		end
		defaultPos = self._zone.defaultPos
	end

	-- search for a good pass dest
	if self:_revaluatePassDest() then
		self:_searchForPassDest()
	end
	self._moveDest = defaultPos
	PathHelper.setDefaultObstacles(self._robot.path, self._robot)

	-- check whether the agent would change its state to accepting an incoming pass (striker should not be active then)
	local _, passInfoTable = next(self._inbox.passInfo())
	assert(Attack.checkPassInfos(self._robot, passInfoTable, false) == false, "Striker shouldn't accept passes")

	if passInfoTable then
		for _, passInfo in ipairs(passInfoTable) do
			local passDest = passInfo.ballPos
			vis.addCircle("t/striker", defaultPos, 0.1, vis.colors.slateHalf, true)
			if self._passDestSuggestion then
				local color = passInfo.target == self._robot
					and vis.colors.turquoiseHalf or vis.colors.whiteHalf
				vis.addCircle("t/striker", passInfo.ballPos, 0.1, color, true)
				vis.addCircle("t/striker", self._passDestSuggestion, 0.14,
					vis.colors.whiteHalf, false, nil, nil, 0.03)
				vis.addPath("t/striker", {defaultPos, self._passDestSuggestion},
					vis.colors.slateHalf, nil, nil, 0.02)
			end

			-- don't move between the ball and the pass target
			-- relevant for outgoing passes
			if passInfo.target ~= self._robot then
				self:_avoidLineSegment(World.Ball.pos, passDest)
			end

			-- don't block the pass receiver
			if passInfo.target ~= self._robot then
				local startPoint = passInfo.target.pos
				local endPoint = passInfo.ballPos
				self._robot.path:addLine(startPoint.x, startPoint.y, endPoint.x, endPoint.y, 0.2)
			end
		end
	end
	-- set path obstacles to not interfere with the current attack
	local moveTime = nil
	local _, attackPosition = next(self._inbox.attackPosition())
	if self._moveDest then
		PathHelper.addRobotObstacles(self._robot.path, self._robot)

		-- don't move between the ball and the main attacker
		-- relevant for incoming passes
		local mainAttacker = self._inbox.mainAttacker().trainer
		if mainAttacker then
			self:_avoidLineSegment(World.Ball.pos, mainAttacker.pos)
		end

		-- don't move between the ball and the opponent goal
		-- relevant for goal shots
		local _, shootDest = next(self._inbox.shootDestination())
		Attack.addShootGoalObstacle(self._robot, shootDest, attackPosition)
	end

	-- send a suggestion for a pass in the run
	if self._passDestSuggestion and attackPosition then
		self:_suggestPass(self._passDestSuggestion, attackPosition, moveTime)
	end

	self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
end


return Striker
