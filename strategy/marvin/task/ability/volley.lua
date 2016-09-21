local Volley = {}

local Constants = require "../base/constants"
local debug = require "../base/debug"
local geom = require "../base/geom"
local vis = require "../base/vis"
local World = require "../base/world"
local Ball = require "observer/ball"
local Physics = require "observer/physics"
local Robot = require "observer/robot"
local Direct = require "trajectory/direct"
local ToTarget = require "trajectory/totarget"


local mu_x = 0.78
local mu_y = 0.1

local paramsUpdated = false

local function setSimulatorParams()
	if not World.IsSimulated or paramsUpdated then
		return
	end
	paramsUpdated = true
	mu_x = 1.05
	mu_y = 0.9
end

function Volley.getParams()
	return mu_x, mu_y
end

function Volley.setParams(new_mu_x, new_mu_y)
	mu_x = new_mu_x
	mu_y = new_mu_y
end


function Volley:init()
	setSimulatorParams()
	self._ballIncoming = true
	self._shooting = false
	self._volleyObserver = nil

	self._ball_in = nil
end

function Volley.calcVOut(v_s, v_in, phi, alpha)
	local sinp = math.sin(phi)
	local cosp = math.cos(phi)
	local sinpa = math.sin(phi - alpha)
	local cospa = math.cos(phi - alpha)

	local x = cosp * v_s + sinp * sinpa * mu_x * v_in - cosp * cospa * mu_y * v_in
	local y = sinp * v_s - cosp * sinpa * mu_x * v_in - sinp * cospa * mu_y * v_in

	return x, y
end

local function volley_Jf(v_s, phi, alpha, v_in)
	local sinp = math.sin(phi)
	local cosp = math.cos(phi)
	local sinpa = math.sin(phi - alpha)
	local cospa = math.cos(phi - alpha)

	local xdv_s = cosp
	local xdphi = -sinp * v_s + (mu_x + mu_y) * v_in * (cosp * sinpa + sinp * cospa)
	local ydv_s = sinp
	local ydphi = cosp * v_s - (mu_x + mu_y) * v_in * (cosp * cospa - sinp * sinpa)

	return xdv_s, xdphi, ydv_s, ydphi
end

function Volley:calcPhi(ballSpeed, viewPos, targetPos, targetSpeed)
	-- relative ball speed
	ballSpeed = ballSpeed - self._robot.speed
	local v_in = ballSpeed:length()
	local alpha = ballSpeed:angle()

	-- calculate required shoot speed
	local dist = targetPos:distanceTo(viewPos)
	local abs_v_out = self._robot:calculateShootSpeed(targetSpeed, dist)
	if targetSpeed == math.huge then
		abs_v_out = self._robot.maxShotLinear + mu_y * v_in
	end
	abs_v_out = math.min(Constants.maxBallSpeed, abs_v_out)
	if self._volleyObserver ~= nil then
		local ball = { pos = viewPos, speed = (targetPos - viewPos):setLength(abs_v_out), radius = World.Ball.radius, maxSpeed = abs_v_out }
		local expectedTargetSpeed = Physics.ballAtTime(ball, Physics.ballRollTime(ball, dist)).speed:length()
		self._volleyObserver(ballSpeed, viewPos, targetPos, expectedTargetSpeed)
	end

	-- relative output speed
	local v_out = (targetPos - viewPos):setLength(abs_v_out) - self._robot.speed

	-- guess initial values for v_s and phi
	local v_s = abs_v_out
	local phi = (targetPos - viewPos):angle()
	-- caching
	local calcVOut = Volley.calcVOut
	local visData = {}

	for i = 1, 5 do
		local j11, j12, j21, j22 = volley_Jf(v_s, phi, alpha, v_in)
		local det = j11 * j22 - j21 * j12
		local k11, k12, k21, k22 = j22/det, -j12/det, -j21/det, j11/det

		local fx, fy = calcVOut(v_s, v_in, phi, alpha)
		fx = fx - v_out.x
		fy = fy - v_out.y

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

		table.insert(visData, phi)
	end
	-- don't block the jit by calling c code
	for _, visPhi in ipairs(visData) do
		vis.addPath("t/a/volley: Iterations",
				{self._robot.pos, self._robot.pos + Vector.fromAngle(visPhi):scaleLength(100)},
				vis.colors.greenHalf)
	end

	local baseAngle = (targetPos - viewPos):angle()
	if math.abs(geom.getAngleDiff(baseAngle, phi)) > math.pi/2 then
		-- FIXME: correct fallback for wrong direction
		-- Angle differs more than 90 degrees from the base angle
		-- this is only possible if v_s was negative
		return geom.normalizeAngle(phi + math.pi), 0
	end
	return phi, v_s
end

--- performs a volley shot without actively catching the ball
-- @param viewPos Vector - the ball's position when it touches the dribbler
-- @param targetPos Vector - where to shoot at
-- @param targetSpeed number - how fast the Ball should arrive at targetPos
function Volley:_volley(viewPos, targetPos, targetSpeed)
	self:setMainAttackerParameters(targetPos, self._robot.maxSpeed)
	-- init ball_in speed
	if self._ballIncoming then
		local ballRollTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(viewPos))
		local futureBall = Physics.ballAtTime(World.Ball, ballRollTime)
		self._ball_in = futureBall.speed
	end

	local phi, v_s = self:calcPhi(self._ball_in, viewPos, targetPos, targetSpeed)

	-- position the robot to receive the pass
	local robotPos = viewPos - Vector.fromAngle(phi):scaleLength(
				World.Ball.radius + self._robot.shootRadius)
	self._robot.trajectory:update(ToTarget, robotPos, phi, nil, nil)

	-- only shoot if the robot looks about in the right direction
	local angle_error = math.abs(geom.getAngleDiff(self._robot.dir, phi))
	if angle_error < 4 / 180 * math.pi then
		self._shooting = true
	elseif angle_error > 6 / 180 * math.pi then
		self._shooting = false
	end
	if self._shooting then
		self._robot:shoot(v_s, true)
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


	if Robot.hadBall(self._robot, 0) then
		self._ballIncoming = false
	elseif Ball.isShot() then
		self._ballIncoming = true
	end
	self._send.shootDestination("all", targetPos)
end

return Volley
