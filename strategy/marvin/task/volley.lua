local Volley = (require "../base/class").new("Task.Volley", require "task/shoot")
local VolleyAnalyzer = (require "../base/class").new("Task.Volley.Analyzer", require "../base/process")

local MovingAverage = require "learning/movingaverage"
local World = require "../base/world"
local geom = require "../base/geom"
local vis = require "../base/vis"
local Ball = require "observer/ball"
local Processor = require "../base/processor"


Volley.priority = 5


function VolleyAnalyzer:init(robot, mamux, mamuy)
	self._robot = robot
	self._exitTimer = World.Time + 1
	self._maMuX = mamux
	self._maMuY = mamuy
	self._hasFinished = false
end

-- get used params, also used for keep-alive
function VolleyAnalyzer:update(phi, alpha, v_in, v_out_x, v_out_y, v_s)
	self._exitTimer = World.Time + 1
	self._phi = phi
	self._alpha = alpha
	self._v_in = v_in
	self._v_out_x = v_out_x
	self._v_out_y = v_out_y
	self._v_s = v_s
end

function VolleyAnalyzer:run()
	-- params are missing
	if not self._alpha then
		return
	end

	-- get parameters just before the ball is shot
	if self._robot:hasBall(World.Ball) then
		self._phi = self._robot.dir
		-- receive speed only makes sense before the ball hits the robot
		if not self._receiveSpeed then
			self._receiveSpeed = World.Ball.speed:length()
			-- FIXME intersect with dribbler
			self._dribblerPos = World.Ball.pos
		end
		--log("ball")
	end
	if Ball.isShot() == self._robot then
		self._evaluationTime = World.Time + 0.15
		--log("shot")
	end
	if not self._hasFinished and self._evaluationTime and World.Time > self._evaluationTime then
		local sinp = math.sin(self._phi)		
		local cosp = math.cos(self._phi)		
		local sinpa = math.sin(self._phi - self._alpha)		
		local cospa = math.cos(self._phi - self._alpha)

		local mu_y = (
			- ((cosp * cosp * self._v_s / sinp) + (cosp * self._v_out_x / sinp) - (sinp * self._v_s) - (self._v_out_y))
			/ ((cospa * self._v_in) * ((cosp * cosp / sinp) + sinp))
		)
		local mu_x = (cosp * self._v_s + cosp * cospa * mu_y * self._v_in - self._v_out_x) / (sinp * sinpa * self._v_in)

		log("mu: " .. mu_x .. "   " .. mu_y .. "    speed: " .. self._v_s)
		--self._maMuX:addValue(mu_x)
		--self._maMuY:addValue(mu_y)
		
		self._evaluationTime = nil
		self._exitTimer = World.Time + 1
		self._hasFinished = true
	end
end

function VolleyAnalyzer:isFinished()
	if World.Time > self._exitTimer then
		return true
	end
	return false
end



function Volley:_init()
	--log("start volley task on robot "..tostring(self._robot))
	self._ballIncoming = true
	self._maMuX = MovingAverage.get("Volley Mu X", 5, 0.45)
	self._maMuY = MovingAverage.get("Volley Mu Y", 5, 0.65)
	if amun.isDebug then
		self._analyzer = VolleyAnalyzer.create(self._robot, self._maMuX, self._maMuY)
		Processor.addPost(self._analyzer)
	end
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
	self._mu_x = self._maMuX:value()
	self._mu_y = self._maMuY:value()

	-- init v_in and alpha
	if self._ballIncoming then
		self._v_in = World.Ball.speed:length()
		self._alpha = World.Ball.speed:angle() + math.pi
	end

	-- init v_out_x and v_out_y
	local dist = targetPos:distanceTo(self._robot.pos)
	local dirToTarget = (targetPos - self._robot.pos):normalize()
	local abs_v_out = math.min(self._robot:calculateShootSpeed(targetSpeed, dist), self._robot.maxShotLinear + 5)
	self._v_out_x = dirToTarget.x * abs_v_out
	self._v_out_y = dirToTarget.y * abs_v_out

	-- guess initial values for v_s and phi
	local v_s = abs_v_out
	local gamma = dirToTarget:angle()
	local phi = (self._alpha + gamma)/2

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


		--log("v_s: " .. v_s .. "      phi: " .. phi)
	end

	--log("angle: " .. phi .. "   speed: " .. v_s)

	-- catch the ball and shoot
	local viewPoint = self._robot.pos + Vector.fromAngle(phi):scaleLength(10000)
	self._robot:_shoot(v_s)
	self:_catchBall(viewPoint, 1)

	if amun.isDebug then
		self._analyzer:update(phi, self._alpha, self._v_in, self._v_out_x, self._v_out_y, v_s)
	end

	
	if self._robot:hasBall(World.Ball) then
		self._ballIncoming = false
	end
end

return Volley
