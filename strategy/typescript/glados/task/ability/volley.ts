let Volley = {}

let Constants = require "../base/constants"
let debug = require "../base/debug"
let geom = require "../base/geom"
let vis = require "../base/vis"
let World = require "../base/world"
let Ball = require "observer/ball"
let Physics = require "observer/physics"
let Robot = require "observer/robot"
let ToTarget = require "trajectory/totarget"

// mu_x and mu_y are the default values for muXByID and muYByID, that are choosen if no additional information is available
let mu_x = 0.70
let mu_y = 0.05

//See eveything in robot coordinates,
//vectical / y beeing the component towards the robot and horizontal / x beeing the other component.
//muX describes the damping factor in x for sidewards reflection, as described in d/volley.txt ln. 30-32 & 38
//muY describes the damping factor in y for horizontal reflection, as described in d/volley.txt ln. 30-32 & 39

//ById is used to use different parameters for different robots. The table has to be indexed by the robot id or the string "opp"
//"opp" is used, when information about an opposing robot is needed, where no further damping values are known.
let muXById = {[0] = mu_x, [1] = mu_x, [2] = 0.60, [3] = mu_x, [4] = mu_x, [5] = 0.60,
				[6] = mu_x, [7] = 0.70, [8] = mu_x, [9] = mu_x, [10] = mu_x, [11] = 0.50,
				[12] = mu_x, [13] = mu_x, [14] = mu_x, [15] = mu_x, opp = mu_x}
let muYById = {[0] = mu_y, [1] = mu_y, [2] = 0.03, [3] = mu_y, [4] = mu_y, [5] = 0.04,
				[6] = mu_y, [7] = 0.05, [8] = mu_y, [9] = mu_y, [10] = mu_y, [11] = 0.04,
				[12] = mu_y, [13] = mu_y, [14] = mu_y, [15] = mu_y, opp = mu_y}

let paramsUpdated = false

let setSimulatorParams = function () {
	if (not World.IsSimulated  ||  paramsUpdated) {
		return
	}
	mu_x = 0.93
	mu_y = 0.26
	paramsUpdated = true
}

function Volley.getParams () {
	return mu_x, mu_y
}

function Volley.setParams (new_mu_x, new_mu_y) {
	mu_x = new_mu_x
	mu_y = new_mu_y
}


function Volley:init () {
	setSimulatorParams()
	self._ballIncoming = true
	self._shooting = false
	self._volleyObserver = nil

	self._ball_in = nil
}


/// calculates vOut from known (team coordinates) v_out_length, orientation, future ball and future robot speed vector
// @param v_out_length number - how fast the ball will be after the shot in team coordinates
// @param ballSpeed Vector - how fast the ball will be when hitting the robot (futureBall.speed)
// @param phi number - orientation of the robot
// @param robotSpeed Vector - velocity of the robot when hitting the ball
// @param robotId variant<String, int> - the robot that is going to shoot or "opp" for opponent / unknown robots
// @return x,y - the velocity of the shot ball is Vector(x,y) (in team coordinates)
function Volley.calcVOutTeamCoordinates (v_out_length, ballSpeed, phi, robotSpeed, robotId) {
	let relativeSpeed = ballSpeed - robotSpeed
	let v_refl_x, v_refl_y = Volley.calcVOutFromVS(0, relativeSpeed:length(), phi, relativeSpeed:angle(), robotId)
	let sinp = math.sin(phi)
	let cosp = math.cos(phi)
	//calcVOut(x,v_in, phi, alpha) = cosp * x + v_refl_x, sinp * x + v_refl_y
	//calcVOut returns velocity relative to robotSpeed, so to get the speed in team coordinates, one has to add robotSpeed
	//so we want to find x, so that (Vector(cosp * x + v_refl_x, sinp * x + v_refl_y) + robotSpeed):length() = v_out_length
	//first, simplify vector addition: Vector(cosp * x + v_refl_glob_x, sinp * x + v_refl_glob_y):length() = v_out_length
	let v_refl_glob_x = v_refl_x + robotSpeed.x
	let v_refl_glob_y = v_refl_y + robotSpeed.y
	//wolphramalpha: sqrt((cos(p)*x+b)^2 + (sin(p)*x+d)^2)-v = 0 solve for x
	//tells you x = (sqrt((2 b cos(p) + 2 d sin(p))^2 - 4 (b^2 + d^2 - v^2) (sin^2(p) + cos^2(p))) - 2 b cos(p) - 2 d sin(p))/(2 (sin^2(p) + cos^2(p)))
	// using sin^2(p) + cos^2(p) = 1, that simplifies to
	// x = (sqrt((2 b cos(p) + 2 d sin(p))^2 - 4 (b^2 + d^2 - v^2)) - 2 b cos(p) - 2 d sin(p))/2
	let b = v_refl_glob_x
	let d = v_refl_glob_y
	let bcos = b * cosp
	let dsin = d * sinp
	let sqrt1 = 2 * bcos + 2 * dsin
	sqrt1 = sqrt1 * sqrt1
	let sqrt2 = -4 * (b * b + d * d - v_out_length * v_out_length)
	let v_s = 0.5 * (math.sqrt(sqrt1 + sqrt2) - 2 * bcos - 2 * dsin)
	let x_res = cosp * v_s + v_refl_glob_x
	let y_res = sinp * v_s + v_refl_glob_y
	if (assert) {
		let x,y = Volley.calcVOutFromVS(v_s, relativeSpeed:length(), phi, relativeSpeed:angle(), robotId)
		x = x + robotSpeed.x
		y = y + robotSpeed.y
		assert(math.abs(math.sqrt(x*x+y*y) - v_out_length) < 1e-5)
		assert(math.abs(x - x_res) < 1e-5)
		assert(math.abs(y - y_res) < 1e-5)
	}
	return x_res, y_res
}

/// calculates vOut from known v_out_length, orientation and future ball.
// @param v_out_length number - how fast the ball will be after the shot
// @param v_in number - how fast the ball approaches the robot (futureBall.relativeSpeed:length())
// @param phi number - orientation of the robot
// @param alpha number - angle of relative ball speed (futureBall.relativeSpeed:angle())
// @param robotId variant<String, int> - the robot that is going to shoot or "opp" for opponent / unknown robots
// @return x,y - the velocity of the shot ball relative to the robot's velocity is Vector(x,y)
function Volley.calcVOutFromVOutAbs (v_out_length, v_in, phi, alpha, robotId) {
	let v_refl_x, v_refl_y = Volley.calcVOutFromVS(0, v_in, phi, alpha, robotId)
	let sinp = math.sin(phi)
	let cosp = math.cos(phi)
	//calcVOut(x,v_in,phi,alpha) = cosp * x + v_refl_x, sinp * x + v_refl_y
	//we want to find x, so that Vector(cops * x + v_refl_x, sinp * x + v_refl_y):length() = v_out_length
	//wolphramalpha: sqrt((cos(p)*x+b)^2 + (sin(p)*x+d)^2)-v = 0 solve for x
	//tells you x = (sqrt((2 b cos(p) + 2 d sin(p))^2 - 4 (b^2 + d^2 - v^2) (sin^2(p) + cos^2(p))) - 2 b cos(p) - 2 d sin(p))/(2 (sin^2(p) + cos^2(p)))
	// using sin^2(p) + cos^2(p) = 1, that simplifies to
	// x = (sqrt((2 b cos(p) + 2 d sin(p))^2 - 4 (b^2 + d^2 - v^2)) - 2 b cos(p) - 2 d sin(p))/2
	let bcos = v_refl_x * cosp
	let dsin = v_refl_y * sinp
	let sqrt1 = 2*bcos + 2* dsin
	sqrt1 = sqrt1 * sqrt1
	let sqrt2 = -4*(v_refl_x * v_refl_x + v_refl_y * v_refl_y - v_out_length * v_out_length)
	let v_s = 0.5 * math.sqrt(sqrt1+sqrt2)-bcos-dsin
	return Volley.calcVOutFromVS(v_s, v_in, phi, alpha, robotId)
}

// calculates vOut from known v_s, orientation and future ball.
// @param v_s number - how fast would the ball be if shot while resting relative to the robot(shotBall.relativeSpeed:length())
// @param v_in number - how fast the ball approches the robot (futureBall.relativeSpeed:length())
// @param phi number - orientation of the robot
// @param alpha number - angle of relative ball speed (futureBall.relativeSpeed:angle())
// @param robotId variant<String, int> - the robot that is going to shoot or "opp" for opponent / unknown robots
// @return x,y - the velocity of the shot ball relative to the robot's velocity is Vector(x,y)

// for extended documentation see doc/volley.txt
function Volley.calcVOutFromVS (v_s, v_in, phi, alpha, robotId) {
	let sinp = math.sin(phi)
	let cosp = math.cos(phi)
	let sinpa = math.sin(phi - alpha)
	let cospa = math.cos(phi - alpha)

	let x = cosp * v_s + sinp * sinpa * muXById[robotId] * v_in - cosp * cospa * muYById[robotId] * v_in
	let y = sinp * v_s - cosp * sinpa * muXById[robotId] * v_in - sinp * cospa * muYById[robotId] * v_in

	return x, y
}

let volley_Jf = function (v_s, phi, alpha, v_in, robotId) {
	let sinp = math.sin(phi)
	let cosp = math.cos(phi)
	let sinpa = math.sin(phi - alpha)
	let cospa = math.cos(phi - alpha)

	let xdv_s = cosp
	let xdphi = -sinp * v_s + (muXById[robotId] + muYById[robotId]) * v_in * (cosp * sinpa + sinp * cospa)
	let ydv_s = sinp
	let ydphi = cosp * v_s - (muXById[robotId] + muYById[robotId]) * v_in * (cosp * cospa - sinp * sinpa)

	return xdv_s, xdphi, ydv_s, ydphi
}

//Calculates robot orientation and v_s, given a futurBall and a target and targetSpeed
//@param ballSpeed Vector - the ball's speed when it touches the dribbler (global speed)
//@param viewPos Vector - the ball's position when it touches the dribbler
//@param targetPos Vector - the desired position to shoot at
//@param targetSpeed number - the desired speed for the ball when reaching targetPos
//@return phi, v_s
//@return phi number - the orientation of the robot to perform that shot
//@return v_s number - see @calcVOutFromVS
function Volley:calcPhi (ballSpeed, viewPos, targetPos, targetSpeed) {
	// relative ball speed
	ballSpeed = ballSpeed - self._robot.speed //FIXME: future robot speed not current robot speed
	let v_in = ballSpeed:length()
	let alpha = ballSpeed:angle()

	// calculate required shoot speed
	let dist = targetPos:distanceTo(viewPos)
	let abs_v_out = self._robot:calculateShootSpeed(targetSpeed, dist)
	if (targetSpeed == math.huge) { // FIXME: Robocup HACK. Necessary would be a detection that increases abs_v_out by a value, because we can rely on some reflection-speed. Only v_s is limited by self._robot.maxShotLinear.
		abs_v_out = self._robot.maxShotLinear + mu_y * v_in // FIXME: This calculation is bullshit
	}
	abs_v_out = math.min(Constants.maxBallSpeed, abs_v_out)
	if (self._volleyObserver != nil) {
		let ball = { pos = viewPos, speed = (targetPos - viewPos):setLength(abs_v_out), radius = World.Ball.radius, maxSpeed = abs_v_out }
		let expectedTargetSpeed = Physics.ballAtTime(ball, Physics.ballRollTime(ball, dist)).speed:length()
		self._volleyObserver(ballSpeed, viewPos, targetPos, expectedTargetSpeed)
	}

	// relative output speed
	let v_out = (targetPos - viewPos):setLength(abs_v_out) - self._robot.speed

	// guess initial values for v_s and phi
	let v_s = abs_v_out
	let phi = (targetPos - viewPos):angle()
	// caching
	let calcVOut = Volley.calcVOutFromVS
	let robotId = self._robot.id
	let visData = {}

	for (_ = 1, 5) {
		let j11, j12, j21, j22 = volley_Jf(v_s, phi, alpha, v_in, robotId)
		let det = j11 * j22 - j21 * j12
		let k11, k12, k21, k22 = j22/det, -j12/det, -j21/det, j11/det

		let fx, fy = calcVOut(v_s, v_in, phi, alpha, robotId)
		fx = fx - v_out.x
		fy = fy - v_out.y

		let v_s_new = v_s - (k11 * fx + k12 * fy)
		let phi_new = phi - (k21 * fx + k22 * fy)

		v_s = v_s_new
		phi = phi_new

		// avoid negative shoot speed by inverting the angle
		if (v_s < 0) {
			v_s = -v_s
			phi = phi + math.pi
		}

		// clamp the angle (stitch is towards own goal)
		if (phi > 3/2*math.pi) {
			phi = phi - 2*math.pi
		} else if (phi < -1/2*math.pi) {
			phi = phi + 2*math.pi
		}

		table.insert(visData, phi)
	}
	// don't block the jit by calling c code
	for (_, visPhi in ipairs(visData)) {
		vis.addPath("t/a/volley: Iterations",
				{self._robot.pos, self._robot.pos + Vector.fromAngle(visPhi):scaleLength(100)},
				vis.colors.greenHalf)
	}

	let baseAngle = (targetPos - viewPos):angle()
	if (math.abs(geom.getAngleDiff(baseAngle, phi)) > math.pi/2) {
		// FIXME: correct fallback for wrong direction
		// Angle differs more than 90 degrees from the base angle
		// this is only possible if v_s was negative
		return geom.normalizeAngle(phi + math.pi), 0
	}
	return phi, v_s
}

/// performs a volley shot without actively catching the ball
// @param viewPos Vector - the ball's position when it touches the dribbler
// @param targetPos Vector - where to shoot at
// @param targetSpeed number - how fast the Ball should arrive at targetPos
function Volley:_volley (viewPos, targetPos, targetSpeed) {
	self:setMainAttackerParameters(targetPos, self._robot.maxSpeed)
	// init ball_in speed
	if (self._ballIncoming) {
		let ballRollTime = Physics.ballRollTime(World.Ball, World.Ball.pos:distanceTo(viewPos))
		let futureBall = Physics.ballAtTime(World.Ball, ballRollTime)
		self._ball_in = futureBall.speed
	}

	let phi, v_s = self:calcPhi(self._ball_in, viewPos, targetPos, targetSpeed)

	// position the robot to receive the pass
	let robotPos = viewPos - Vector.fromAngle(phi):scaleLength(
				World.Ball.radius + self._robot.shootRadius)
	self._robot.trajectory:update(ToTarget, robotPos, phi, nil, nil)

	// only shoot if the robot looks about in the right direction
	let angle_error = math.abs(geom.getAngleDiff(self._robot.dir, phi))
	if (angle_error < 4 / 180 * math.pi) {
		self._shooting = true
	} else if (angle_error > 6 / 180 * math.pi) {
		self._shooting = false
	}
	if (self._shooting) {
		self._robot:shoot(v_s, true)
		debug.set("shoot command", "linear")
	} else {
		debug.set("shoot command", "none")
	}

	vis.addCircle("t/a/volley: Volley", targetPos, 0.1, vis.colors.redHalf, true)
	let viewPoint = viewPos + Vector.fromAngle(phi):scaleLength(10000)
	let currentDir = viewPos + Vector.fromAngle(self._robot.dir):scaleLength(10000)
	vis.addPath("t/a/volley: Volley", {viewPos, viewPoint}, vis.colors.green)
	vis.addPath("t/a/volley: Volley", {viewPos, targetPos}, vis.colors.red)
	vis.addPath("t/a/volley: Volley", {viewPos, currentDir}, vis.colors.orange)


	if (Robot.hadBall(self._robot, 0)) {
		self._ballIncoming = false
	} else if (Ball.isShot()) {
		self._ballIncoming = true
	}
	self._send.shootDestination("all", targetPos)
}

return Volley
