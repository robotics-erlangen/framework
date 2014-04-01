local ChipAway = (require "../base/class").new("Task.ChipAway", require "task/shoot")

local World = require "../base/world"
local ToTarget = require "trajectory/totarget"
local Settings = require "settings"
local Shoot = require "observer/shoot"
local Robot = require "observer/robot"
local Rating = require "util/rating"


ChipAway.priority = 6

function ChipAway:_init()
	self._chipTarget = nil
end

function ChipAway:_canShoot()
	return true
end

function ChipAway:run()
	-- FIXME consider that we are able to chip over opponents
	if not self._chipTarget then
		self._chipTarget = Shoot.bestFreeAssistant(self._robot, self._inbox.attackerFlag("ignorePriority"))
	end
	if self._chipTarget and self._chipTarget.pos.y < self._robot.pos.y then
		self._chipTarget = nil -- prevent back-passing
	end
	
	local chipPos = self._chipTarget and self._chipTarget.pos or World.Geometry.OpponentGoal
	self._robot:setDribblerSpeed(1)
	self:_shoot(chipPos, math.huge, false)

	if self._chipTarget then
		self._send(self._chipTarget).passSender("direct")
	end
end

return ChipAway
