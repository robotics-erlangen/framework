local Shoot = require "task/ability/shoot"
local ShootGoal = Class("Task.ShootGoal", require "task/base", Shoot)

local debug = require "../base/debug"
local Field = require "../base/field"
local Referee = require "../base/referee"
local vis = require "../base/vis"
local World = require "../base/world"

local Ball = require "observer/ball"
local Goal = require "observer/goal"
local Physics = require "observer/physics"
local ObserverShoot = require "observer/shoot"
local PathHelper = require "trajectory/pathhelper"
local Interval = require "util/interval"
local Rating = require "util/rating"
local ShootGoalUtil = require "util/shootgoal"

local G = World.Geometry

local function _drawDebugInfo(self, target, mode)
	local color
	if self._desperate then
		mode = mode or "desperate unspcified"
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
	self._desperateTargetPoint = nil
	self._desperateTargetID = nil

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

	local lockTarget = self._shootTargetPoint and World.Ball.speed:length() > 1 and
		(Ball.receivesPass(self._robot) and Physics.checkedBallRollTime(World.Ball, ballReceiptPos) < 0.5 or
			World.Ball.pos:distanceTo(self._robot.pos) < 0.5)
	if not lockTarget then
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

	local mode = nil

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

		ballReceiptPos = ballReceiptPos or World.Ball.pos
		debug.set("ballReceiptPos", ballReceiptPos)

		local onlyOppOcc = {}
		local disabled = true --FIXME after solving TODO
		localTarget = nil

		if not disabled then

			local occupied = Goal.getOccupiedSectors(ballReceiptPos, World.OpponentRobots,  0, math.pi, true) --TODO extrapolate them
			Interval.sort(occupied)
			Interval.merge(occupied)

			local bothOcc = Goal.getOccupiedSectors(ballReceiptPos, World.Robots, 0, math.pi, true) -- TODO extrapolate them
			Interval.sort(bothOcc)
			Interval.merge(bothOcc)

			local bothCnt , occCnt = 1,1
			while true do
				if occCnt > #occupied or bothCnt > #bothOcc then
					break
				end
				local intervalB = bothOcc[bothCnt]
				local intervalE = occupied[occCnt]
				--floatEq is correct here
				if intervalB[1] == intervalE[1] and intervalB[2] == intervalE[2] then
					table.insert(onlyOppOcc, intervalB)
					occCnt = occCnt + 1
					bothCnt = bothCnt + 1
				elseif intervalB[1] < intervalE[1] then
					bothCnt = bothCnt + 1
				else
					occCnt = occCnt + 1
				end
			end
		end

		if #onlyOppOcc <= 0 then
			self._desperateTargetID = nil
		end

		if #onlyOppOcc > 0 and not self._desperateTargetPoint then
			local EPSILON = 0.0001
			--state: desperate clean
			repeat
				local selectedInterval = nil
				if self._desperateTargetID then
					--try to continue shooting at the same bot
					--TODO: don't pretend its always going to be that side
					for _,v in ipairs(onlyOppOcc) do
						if v[3][1].id == self._desperateTargetID then
							selectedInterval = v
							break
						end
					end
				end
				if not selectedInterval then
					self._desperateTargetID = nil
					--TODO: Use heuristic instead of random
					selectedInterval = onlyOppOcc[math.random(#onlyOppOcc)]
				end
				local selectedDir = selectedInterval[1] + 1/2 * ((selectedInterval[3][1].pos - ballReceiptPos):angle() - selectedInterval[1]) --TODO: select side
				local angleError = selectedDir - selectedInterval[1]
				local avoidIcing = ballReceiptPos.y < 0.3
				if avoidIcing then
					local lineCut = Field.nextLineCut(ballReceiptPos, Vector.fromAngle(selectedDir + angleError))
					if lineCut and math.abs(lineCut.y - G.FieldHeightHalf) < EPSILON then
						table.removeValue(onlyOppOcc, selectedInterval)
						goto continue
					end
					lineCut = Field.nextLineCut(ballReceiptPos, Vector.fromAngle(selectedDir - angleError))
					if lineCut and math.abs(lineCut.y - G.FieldHeightHalf) < EPSILON then
						table.removeValue(onlyOppOcc, selectedInterval)
						goto continue
					end
				end

				self._desperateTargetID = selectedInterval[3][1].id
				localTarget = Vector.fromAngle(selectedDir) + ballReceiptPos
				mode = "desperate clean"
				self:_shoot(localTarget, math.huge, ballReceiptPos, angleError)
				::continue::
			until (self._desperateTargetID ~= nil or #onlyOppOcc == 0)
		end
		if (ballReceiptPos.y < (self._desperateTargetPoint and 0.5 or 0)) and not linearOverride and not self._desperateTargetID then
			mode = "desperate chip"
			localTarget = Vector(0, (G.FieldHeightHalf + self._robot.pos.y) / 2)
			self:_chipPass(localTarget, ballReceiptPos, maxAngleError, 0.5)
			self._desperateTargetPoint = localTarget
		else
			self._desperateTargetPoint = nil
		end
		if localTarget == nil then
			mode = "desperate desperate"
			--state: desperate desperate
			--shoot at the center of the opponent goal
			localTarget = Vector(0, G.FieldHeightHalf)
			self:_shoot(localTarget, math.huge, ballReceiptPos, maxAngleError)
		end
	end
	_drawDebugInfo(self, localTarget, mode)
end

return ShootGoal
