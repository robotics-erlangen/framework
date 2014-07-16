-- load abilities
local CatchBall = require "task/ability/catchball"
local Shoot = require "task/ability/shoot"

local ChipAway = (require "../base/class").newTask("Task.ChipAway", require "task/base",
		CatchBall, Shoot)

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"
local Robot = require "observer/robot"
local Rating = require "util/rating"

function ChipAway:_init()
	self._chipTarget = nil
end

function ChipAway:_canShoot()
	return true
end

function ChipAway:run()
	-- FIXME consider that we are able to chip over opponents
	if not self._chipTarget then
		self._chipTarget = Shoot.bestFreeAssistant(self._robot)
	end
	if self._chipTarget and self._chipTarget.pos.y < self._robot.pos.y then
		self._chipTarget = nil -- prevent back-passing
	end

	local chipPos = self._chipTarget and self._chipTarget.pos or World.Geometry.OpponentGoal
	self:_shoot(chipPos, math.huge, false)

	if self._chipTarget then
		self._send.passSender(self._chipTarget, "direct")
	end
end

return ChipAway
