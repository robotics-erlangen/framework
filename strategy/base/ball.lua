local geom = require "../base/geom"
local Ball = (require "../base/class").new("Ball")
local Constants = require "../base/constants"

--[[
--- Ball class.
module "Ball"
]]--

--- Values provided by Ball
-- @class table
-- @name Ball
-- @field pos Vector - Current ball position
-- @field speed Vector - Movement direction, length is speed in m/s
-- @field radius number - Ball radius
-- @field isVisible bool - True if ball is tracked
-- @field lostSince number - Time when the ball was lost. Only has meaning when Ball isn't visible

function Ball.mt:__tostring()
	return string.format("Ball(pos = (%6.3f, %6.3f), speed = %3.1f)",
		self.pos.x, self.pos.y, self.speed:length())
end

function Ball:init()
	self.radius = 0.0215
	self.isVisible = false
	self.lostSince = 0
	self.pos = Vector.createReadOnly(0, 0)
	self.speed = Vector.createReadOnly(0, 0)
	self.deceleration = Vector.createReadOnly(0, 0)
	self.brakeTime = 0
end

function Ball:_update(data, teamIsBlue, time)
	if not data then
		if self.isVisible ~= false then
			self.isVisible = false
			self.lostSince = time
		end
		return
	end
	self.isVisible = true
	self.pos = geom._invertToTeam(Vector.createReadOnly(data.p_x, data.p_y), teamIsBlue)
	self.speed = geom._invertToTeam(Vector.createReadOnly(data.v_x, data.v_y), teamIsBlue)
	
	 -- if ball is too slow then it's movement direction isn't exact enough to be used for prediction the ball
	if self.speed:length() < 0.05 then
		self.deceleration = Vector.createReadOnly(0, 0)
		self.brakeTime = 0
	else
		local ballDeceleration = Constants.ballDeceleration -- negative value
		self.deceleration = self.speed:copy():setLength(ballDeceleration)
		-- time until the ball stops, assuming a linear decrease of velocity
		-- |v| - |a| * t = 0
		self.brakeTime = self.speed:length()/-ballDeceleration
	end
end

function Ball:isPositionValid()
	if not self.isVisible then
		return false
	end
	return not self.pos:isNan() and not self.speed:isNan()
end

return Ball
