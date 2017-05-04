local Shoot = require "task/ability/shoot"
local ShootGoal = Class("Task.ShootGoal", require "task/base", Shoot)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local PathHelper = require "trajectory/pathhelper"
local Rating = require "util/rating"
local ShootGoalUtil = require "util/shootgoal"

local G = World.Geometry


function ShootGoal:_drawDebugInfo()
	local target, color, mode
	if self._desperate then
		mode = "desperate"
		target = self._desperateChipTargetPoint
		color = vis.colors.redHalf
	else
		target = self._shootTargetPoint
		if self._dirty then
			mode = "dirty"
			color = vis.colors.orangeHalf
		else
			mode = "clean"
			color = vis.colors.yellowHalf
		end
	end

	debug.set("mode", mode)
	vis.addCircle("t/shootgoal: target", target, 0.05, color, true)
end

function ShootGoal:_init(ballReceiptPos)
	self._robotList = {}
	self._robotListWithoutKeeper = {}

	self._robotListTimestamp = 0
	self._updateTargetTimestamp = 0

	self._shootTargetPoint = nil
	self._shootTargetWidth = 0
	self._dirty = false
	self._desperate = false
	self._desperateChipTargetPoint = nil

	self._ballReceiptPos = ballReceiptPos
end

function ShootGoal:run()
	PathHelper.setDefaultObstacles(self._robot.path, self._robot, true)

	if not self._shootTargetPoint or not Ball.receivesPass(self._robot) or
			World.Ball.pos:distanceTo(self._robot.pos) > 0.8 then
		self._shootTargetPoint, self._shootTargetWidth, self._dirty =
			ShootGoalUtil.updateTarget(self._robot, self._shootTargetPoint, self._dirty)
	end

	if self._ballReceiptPos then
		vis.addCircle("ballReceiptPos", self._ballReceiptPos, 0.15, vis.colors.magentaHalf, true)
	end

	-- aim at the center of the goal when shooting from too far away
	local maxDistance = 0.75 * G.FieldHeight
	local minDistance = 0.25 * G.FieldHeight
	local distance = self._robot.pos:distanceTo(self._shootTargetPoint)
	local localTargetX = Rating.valueToRating(distance, maxDistance, minDistance) * self._shootTargetPoint.x
	local localTarget = Vector(localTargetX, self._shootTargetPoint.y)
	
	debug.set("receivesPass", Ball.receivesPass(self._robot))

	self._desperate = self._shootTargetWidth < 0.5 * math.pi / 180
	if not self._desperate then
		-- perform a linear shot
		self:_shoot(localTarget, math.huge, true,
			math.min(10 * math.pi / 180, self._shootTargetWidth or math.huge), self._ballReceiptPos)
	else
		local maxAngleError = 10 * math.pi / 180
		-- prevent icing
		if World.Ball.pos.y < 0 then
			maxAngleError = 2 * math.pi / 180
		end

		if Referee.isFriendlyFreeKickState() or World.RefereeState == "KickoffOffensive" then
			maxAngleError = 0.5 * math.pi / 180
		end

		-- perform a chip shot
		self._desperateChipTargetPoint = G.OpponentGoal
			+ (World.Ball.pos - G.OpponentGoal):setLength(World.Geometry.DefenseRadius+0.1)
		self:_shoot(self._desperateChipTargetPoint,
			self._desperateChipTargetPoint:distanceTo(World.Ball.pos), false, maxAngleError, self._ballReceiptPos)
	end
	self:_drawDebugInfo()
end

return ShootGoal
