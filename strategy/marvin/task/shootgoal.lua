local Shoot = require "task/ability/shoot"
local ShootGoal = Class("Task.ShootGoal", require "task/base", Shoot)

local debug = require "../base/debug"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local ObserverShoot = require "observer/shoot"
local PathHelper = require "trajectory/pathhelper"
local Rating = require "util/rating"
local ShootGoalUtil = require "util/shootgoal"

local G = World.Geometry

local DESPERATE_CHIP_EXTRA_DISTANCE = 0.5 -- extra chip distance when performing a goal chip

local function _drawDebugInfo(self, target)
	local color, mode
	if self._desperate then
		mode = "desperate"
		target = self._desperateChipTargetPoint
		color = vis.colors.redHalf
	else
		if self._dirty then
			mode = "dirty"
			color = vis.colors.orangeHalf
		else
			mode = "clean"
			color = vis.colors.yellowHalf
		end
	end

	debug.set("mode", mode)
	debug.set("target", target)
	vis.addCircle("t/shootgoal: target", target, 0.05, color, true)
end

function ShootGoal:_init(ballReceiptPos, forceDesperate)
	self._robotList = {}
	self._robotListWithoutKeeper = {}

	self._robotListTimestamp = 0
	self._updateTargetTimestamp = 0

	self._shootTargetPoint = nil
	self._shootTargetWidth = 0
	self._dirty = false
	self._desperate = forceDesperate or false
	self._desperateChipTargetPoint = nil

	self._ballReceiptPos = ballReceiptPos
	self._lastReceivesPassTime = 0
end

function ShootGoal:run()
    local obstacleTable = {
        inbox = self._inbox
    }
    PathHelper.setDefaultObstaclesByTable(self._robot.path, self._robot, obstacleTable)

	local _, attackPosition = next(self._inbox.attackPosition("broadcast"))
	local ballReceiptPos = self._ballReceiptPos or attackPosition
	if not self._shootTargetPoint or World.Ball.speed:length() < 1 or
			World.Ball.pos:distanceTo(self._robot.pos) > 0.8 then
		self._shootTargetPoint, self._shootTargetWidth, self._dirty =
			ShootGoalUtil.updateTarget(self._robot, self._shootTargetPoint, self._dirty, attackPosition)
	end

	-- aim at the center of the goal when shooting from too far away
	local maxDistance = 0.75 * G.FieldHeight
	local minDistance = 0.25 * G.FieldHeight
	local distance = self._robot.pos:distanceTo(self._shootTargetPoint)
	local localTargetX = Rating.valueToRating(distance, maxDistance, minDistance) * self._shootTargetPoint.x
	local localTarget = Vector(localTargetX, self._shootTargetPoint.y)

	if not self._desperate then
		self._desperate = self._shootTargetWidth < 0.5 * math.pi / 180
	end

	local receivesPass = Ball.receivesPass(self._robot)
	debug.set("receivesPass", receivesPass)
	if receivesPass then
		self._lastReceivesPassTime = World.Time
	end

	local linearOverride = World.Time - self._lastReceivesPassTime < 0.1 and ObserverShoot.volleyPossible(self._robot, localTarget)
	debug.set("linearOverride", linearOverride)
	if linearOverride then
		self._desperate = false
	end

	if not self._desperate then
		-- perform a linear shot
		self:_shoot(localTarget, math.huge, ballReceiptPos, math.min(10 * math.pi / 180, self._shootTargetWidth or math.huge))
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
		self._desperateChipTargetPoint = G.OpponentGoal + Vector(0, DESPERATE_CHIP_EXTRA_DISTANCE)
		self:_chipPass(self._desperateChipTargetPoint, ballReceiptPos, maxAngleError, 0.5)
	end
	_drawDebugInfo(self, localTarget)
end

return ShootGoal
