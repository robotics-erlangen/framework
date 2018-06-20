local SuggestPass = require "task/ability/suggestpass"
local StrikerSampling = require "task/ability/strikersampling"
local Striker = Class("Task.Striker", require "task/base", SuggestPass, StrikerSampling)

local Field = require "../base/field"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"
local G = World.Geometry

local PathHelper = require "trajectory/pathhelper"
local ToTarget = require "trajectory/totarget"
local UtilDefense = require "util/defense"

local Attack = require "util/attack"


function Striker:_init(manualDefaultPos, manualPassDest)
	self._manualDefaultPos = manualDefaultPos
	self._manualPassDest = manualPassDest
	self._passDestSuggestion = manualPassDest

	self._moveDest = nil

	self._zone = nil

	self._revaluateTimestamp = 0

	self._obstacleTable  = {
		ignoreBall = true,
		inbox = self._inbox
	}
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
	self:precalculate()

	local grid_point_count_x = 6
	local grid_point_count_y = 10

	local grid_point_dist_x = G.FieldWidth / grid_point_count_x
	local grid_point_dist_y = G.FieldHeight / grid_point_count_y

	local boundaries = self._zone.boundaries
	local left = boundaries.left
	local right = boundaries.right
	local top = boundaries.top
	local bottom = boundaries.bottom

	-- TODO hysteresis
	-- TODO only consider well-timed pass positions
	-- TODO am strafraum stehen ist geil! -> score anpassen

	local bestPoint = nil
	local bestScore = -math.huge
	for x = grid_point_dist_x * 0.5 - G.FieldWidthHalf, G.FieldWidthHalf, grid_point_dist_x do
		if x > left and x < right then
			for y = grid_point_dist_y * 0.5 - G.FieldHeightHalf, G.FieldHeightHalf, grid_point_dist_y do
				if y > bottom and y < top then
					local candidatePoint = Vector(x, y)
					candidatePoint = Field.limitToAllowedField(candidatePoint, 3 * self._robot.radius + 0.1)
					local score = self:evalLocation(candidatePoint, bestScore)
					local _, passInfoTable = next(self._inbox.passInfo())
					if passInfoTable then
						for _, passInfo in pairs(passInfoTable) do
							if passInfo.ballPos:distanceToSq(candidatePoint) < 0.01*0.01 then
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

function Striker:run()
	self._send.strikerFlag("all")

	if self._manualDefaultPos then
		self._moveDest = self._manualDefaultPos
	else
		-- participate in the striker group
		local groupApplication = { name = "striker", payload = {} }
		self._send.groupApplication("trainer", groupApplication)

		-- retrieve the assigned zone from the striker group
		self._zone = self._inbox.strikerZone().trainer
		if not self._zone then
			return
		end
		self._moveDest = self._zone.defaultPos
	end

	-- search for a good pass dest
	if self:_revaluatePassDest() then
		self:_searchForPassDest()
	end

	-- check whether the agent would change its state to accepting an incoming pass (striker should not be active then)
	local _, passInfoTable = next(self._inbox.passInfo())
	assert(Attack.checkPassInfos(self._robot, passInfoTable, false) == false, "Striker shouldn't accept passes")

	if passInfoTable then
		for _, passInfo in ipairs(passInfoTable) do
			vis.addCircle("t/striker", self._moveDest, 0.1, vis.colors.slateHalf, true)
			if self._passDestSuggestion then
				local color = passInfo.target == self._robot
					and vis.colors.turquoiseHalf or vis.colors.whiteHalf
				vis.addCircle("t/striker", passInfo.ballPos, 0.1, color, true)
				vis.addCircle("t/striker", self._passDestSuggestion, 0.14,
					vis.colors.whiteHalf, false, nil, nil, 0.03)
				vis.addPath("t/striker", {self._moveDest, self._passDestSuggestion},
					vis.colors.slateHalf, nil, nil, 0.02)
			end
		end
	end
	-- set path obstacles to not interfere with the current attack
	local moveTime = nil
	local _, attackPosition = next(self._inbox.attackPosition())
	PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, self._obstacleTable)

	-- send a suggestion for a pass in the run
	if self._passDestSuggestion and attackPosition then
		self:_suggestPass(self._passDestSuggestion, attackPosition, moveTime)
	end

	-- be close to the defense area to catch possible stray shots
	local cbDistToDefenseArea = UtilDefense.centerBackDistanceToDefenseArea()
	if self._passDestSuggestion and not Referee.isFriendlyFreeKickState()
			and Field.distanceToDefenseArea(self._passDestSuggestion, cbDistToDefenseArea) < 0.8 then

		local intersection = Field.intersectRayDefenseArea(self._moveDest, G.OpponentGoal - self._moveDest, cbDistToDefenseArea + 0.3, false)
		self._moveDest = intersection or self._moveDest
	end

	self._robot.trajectory:update(ToTarget, self._moveDest, (World.Ball.pos - self._robot.pos):angle())
end


return Striker
