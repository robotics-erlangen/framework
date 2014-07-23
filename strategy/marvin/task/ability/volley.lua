local Volley = {}

local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Ball = require "observer/ball"
local ToTarget = require "trajectory/totarget"
local Direct = require "trajectory/direct"
local debug = require "../base/debug"

local mu_x = 0.8
local mu_y = 0.3

function Volley:init()
	self._ballIncoming = true
	self._shooting = false

	self._v_in = nil
	self._alpha = nil
	self._v_out_x = nil
	self._v_out_y = nil
end

function Volley.calcVOut(v_s, v_in, phi, alpha)
	local sinp = math.sin(phi)
	local cosp = math.cos(phi)
	local sinpa = math.sin(phi - alpha)
	local cospa = math.cos(phi - alpha)

	local x = cosp * v_s - sinp * sinpa * mu_x * v_in + cosp * cospa * mu_y * v_in
	local y = sinp * v_s + cosp * sinpa * mu_x * v_in + sinp * cospa * mu_y * v_in

	return x, y
end

function Volley:calcPhi(v_in, alpha, viewPos, targetPos, targetSpeed)
	self._v_in = v_in
	self._alpha = alpha

	-- init v_out_x and v_out_y
	local dist = targetPos:distanceTo(viewPos)
	local dirToTarget = (targetPos - viewPos):normalize()
	local abs_v_out = self._robot:calculateShootSpeed(targetSpeed, dist)
	if targetSpeed == math.huge then
		abs_v_out = self._robot.maxShotLinear + mu_y * v_in
	end

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

		local fx, fy = self:_f(v_s, phi)

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
		vis.addPath("t/a/volley: Iterations", {self._robot.pos, viewPoint}, vis.colors.greenHalf)
	end

	return phi, v_s
end


function Volley:_f(v_s, phi)
	local x, y = Volley.calcVOut(v_s, self._v_in, phi, self._alpha)
	return x - self._v_out_x, y - self._v_out_y
end

function Volley:_Jf(v_s, phi)
	local sinp = math.sin(phi)
	local cosp = math.cos(phi)
	local sinpa = math.sin(phi - self._alpha)
	local cospa = math.cos(phi - self._alpha)

	local xdv_s = cosp
	local xdphi = -sinp * v_s - (mu_x + mu_y) * self._v_in * (cosp * sinpa + sinp * cospa)
	local ydv_s = sinp
	local ydphi = cosp * v_s + (mu_x + mu_y) * self._v_in * (cosp * cospa - sinp * sinpa)

	return xdv_s, xdphi, ydv_s, ydphi
end

--- performs a volley shot without actively catching the ball
-- @param viewPos Vector - the ball's position when it touches the dribbler
-- @param targetPos Vector - where to shoot at
-- @param targetSpeed number - how fast the Ball should arrive at targetPos
function Volley:_volley(viewPos, targetPos, targetSpeed)

	-- init v_in and alpha
	if self._ballIncoming then
		local relativeBallSpeed = World.Ball.speed - self._robot.speed
		self._v_in = relativeBallSpeed:length()
		self._alpha = (-relativeBallSpeed):angle()
	end

	local phi, v_s = self:calcPhi(self._v_in, self._alpha, viewPos, targetPos, targetSpeed)

	-- position the robot to receive the pass
	local robotPos = viewPos - Vector.fromAngle(phi):scaleLength(
				World.Ball.radius * 0 + self._robot.shootRadius)

	if self._robot:hasBall(World.Ball) then
		local moveSpeed = Vector.fromAngle(phi)
		self._robot.trajectory:update(Direct, moveSpeed, phi)
	else
		self._robot.trajectory:update(ToTarget, robotPos, phi)
	end


	-- only shoot if the robot looks about in the right direction
	local angle_error = math.abs(geom.getAngleDiff(self._robot.dir, phi))
	if angle_error < 4 / 180 * math.pi then
		self._shooting = true
	elseif angle_error > 6 / 180 * math.pi then
		self._shooting = false
	end
	if self._shooting then
		v_s = math.huge
		self._robot:shoot(v_s, 0)
		debug.set("shoot command", "linear")
	else
		debug.set("shoot command", "none")
	end

	vis.addCircle("t/a/volley: Volley", targetPos, 0.1, vis.colors.redHalf, true)
	local viewPoint = viewPos + Vector.fromAngle(phi):scaleLength(10000)
	local currentDir = viewPos + Vector.fromAngle(self._robot.dir):scaleLength(10000)
	vis.addPath("t/a/volley: Volley", {viewPos, viewPoint}, vis.colors.green)
	vis.addPath("t/a/volley: Volley", {viewPos, targetPos}, vis.colors.red)
	vis.addPath("t/a/volley: Volley", {viewPos, currentDir}, vis.colors.orange)


	if self._robot:hasBall(World.Ball) then
		self._ballIncoming = false
	elseif Ball.isShot() then
		self._ballIncoming = true
	end
	self._send.shootDestination("all", targetPos)
end

return Volley
