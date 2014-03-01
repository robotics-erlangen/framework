local Volley = (require "../base/class").new("Task.Volley", require "task/shoot")

local MovingAverage = require "learning/movingaverage"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Ball = require "observer/ball"
local Processor = require "../base/processor"


Volley.priority = 5

function Volley:_init()
	--log("start volley task on robot "..tostring(self._robot))
	self._ballIncoming = true
end


function Volley:_f(v_s, phi)
	local sinp = math.sin(phi)
	local cosp = math.cos(phi)
	local sinpa = math.sin(phi - self._alpha)
	local cospa = math.cos(phi - self._alpha)

	local x = cosp * v_s - sinp * sinpa * self._mu_x * self._v_in + cosp * cospa * self._mu_y * self._v_in - self._v_out_x
	local y = sinp * v_s + cosp * sinpa * self._mu_x * self._v_in + sinp * cospa * self._mu_y * self._v_in - self._v_out_y

	return x, y
end

function Volley:_Jf(v_s, phi)
	local sinp = math.sin(phi)
	local cosp = math.cos(phi)
	local sinpa = math.sin(phi - self._alpha)
	local cospa = math.cos(phi - self._alpha)

	local xdv_s = cosp
	local xdphi = -sinp * v_s - (self._mu_x + self._mu_y) * self._v_in * (cosp * sinpa + sinp * cospa)
	local ydv_s = sinp
	local ydphi = cosp * v_s + (self._mu_x + self._mu_y) * self._v_in * (cosp * cospa - sinp * sinpa)

	return xdv_s, xdphi, ydv_s, ydphi
end



function Volley:_volley(targetPos, targetSpeed)
	-- init mu_x and mu_y
	self._mu_x = 0.8
	self._mu_y = 0.2


	-- init v_in and alpha
	if self._ballIncoming then
		self._v_in = World.Ball.speed:length()
		self._alpha = (-World.Ball.speed):angle()
	end

	-- init v_out_x and v_out_y
	local dist = targetPos:distanceTo(self._robot.pos)
	local dirToTarget = (targetPos - self._robot.pos):normalize()
	local abs_v_out = math.min(self._robot:calculateShootSpeed(targetSpeed, dist), self._robot.maxShotLinear)
	self._v_out_x = dirToTarget.x * abs_v_out
	self._v_out_y = dirToTarget.y * abs_v_out

	-- guess initial values for v_s and phi
	local v_s = abs_v_out
	local gamma = dirToTarget:angle()
	local phi = gamma
	
	for i = 1, 5 do
		local j11, j12, j21, j22 = self:_Jf(v_s, phi)
		local det = j11 * j22 - j21 * j12
		local k11, k12, k21, k22 = j22/det, -j12/det, -j21/det, j11/det

		--log("J = " .. j11 .. "  " .. j12 .. "  " .. j21 .. "  " .. j22)
		--log("K = " .. k11 .. "  " .. k12 .. "  " .. k21 .. "  " .. k22)

		local fx, fy = self:_f(v_s, phi)
		--log("x/y = " .. fx .. "  " .. fy)

		local v_s_new = v_s - (k11 * fx + k12 * fy)
		local phi_new = phi - (k21 * fx + k22 * fy)

		v_s = v_s_new
		phi = phi_new
		
		-- avoid negative shoot speed by inverting the angle
		if v_s < 0 then
			v_s = -v_s
			phi = phi + math.pi
		end

		-- clamp the angle (stitch is towards own goal)
		if phi > 3/2*math.pi then
			phi = phi - 2*math.pi
		elseif phi < -1/2*math.pi then
			phi = phi + 2*math.pi
		end

		local viewPoint = self._robot.pos + Vector.fromAngle(phi):scaleLength(10000)
		vis.addPath("Volley", {self._robot.pos, viewPoint}, vis.colors.greenHalf)


		--log("(" .. i .. ") v_s: " .. v_s .. "      phi: " .. phi)
	end

	--log("angle: " .. phi .. "   speed: " .. v_s)

	-- catch the ball and shoot
	local viewPoint = self._robot.pos + Vector.fromAngle(phi):scaleLength(10000)
	self._robot:_shoot(v_s)
	self:_catchBall(viewPoint)


	vis.addCircle("Volley", targetPos, 0.1, vis.colors.greenHalf, true)
	vis.addPath("Volley", {self._robot.pos, viewPoint}, vis.colors.green)
	vis.addPath("Volley", {self._robot.pos, targetPos}, vis.colors.red)

	
	if self._robot:hasBall(World.Ball) then
		self._ballIncoming = false
	elseif Ball.isShot() then
		self._ballIncoming = true
	end
end

return Volley
