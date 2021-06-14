import * as Constants from "base/constants";
import * as debug from "base/debug";
import * as geom from "base/geom";
import { bound } from "base/mathutil";
import * as pb from "base/protobuf";
import { FriendlyRobot } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import * as Physics from "glados/observer/physics";

interface DampingFactor {
	mu_x: number;
	mu_y: number;
}

/**
 * These are the default values for muById, that are choosen if no additional information is available
 */
const DEFAULT_DAMPING_FACTOR: DampingFactor = Object.freeze(
	World.WorldStateSource !== pb.world.WorldSource.REAL_LIFE
	? { mu_x: 0.93, mu_y: 0.26 }
	: { mu_x: 0.70, mu_y: 0.05 }
);

type DampingIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | "opp";

/**
 * See everything in robot coordinates.
 * vertical / y beeing the component towards the robot and horizontal / x beeing the other component.
 * mu_x describes the damping in x for sidewards reflection, as described in d/volley.yxt ln 30-32 & 38
 * mu_y describes the damping in y for horizontal reflection, as described in d/volley.txt ln 30-32 & 39
 *
 * Index by robot id as number or by "opp" if information about an opposing robot is needed.
 */
const mus = new Map<DampingIndex, DampingFactor>([
	[0, DEFAULT_DAMPING_FACTOR],
	[1, DEFAULT_DAMPING_FACTOR],
	[2, { mu_x: 0.6, mu_y: 0.03 }],
	[3, DEFAULT_DAMPING_FACTOR],
	[4, DEFAULT_DAMPING_FACTOR],
	[5, { mu_x: 0.6, mu_y: 0.04 }],
	[6, DEFAULT_DAMPING_FACTOR],
	[7, { mu_x: 0.7, mu_y: 0.05 }],
	[8, DEFAULT_DAMPING_FACTOR],
	[9, DEFAULT_DAMPING_FACTOR],
	[10, DEFAULT_DAMPING_FACTOR],
	[11, { mu_x: 0.5, mu_y: 0.04}],
	[12, DEFAULT_DAMPING_FACTOR],
	[13, DEFAULT_DAMPING_FACTOR],
	[14, DEFAULT_DAMPING_FACTOR],
	[15, DEFAULT_DAMPING_FACTOR],
	["opp", DEFAULT_DAMPING_FACTOR]
]);

export function setDampingParam(id: DampingIndex, param: DampingFactor) {
	mus[id] = param;
}

export function getDampingParam(id: DampingIndex | "default"): Readonly<DampingFactor> {
	return World.WorldStateSource !== pb.world.WorldSource.REAL_LIFE || id === "default"
		? DEFAULT_DAMPING_FACTOR
		: mus[id]!;
}

type VolleyObserver = (ballSpeed: Speed, viewPos: Position, targetPos: Position,
		expectedTargetSpeed: number) => void;

/**
 * Calculates vOut from known (team coordinates) v_out_length, orientation, future ball and future robot speed vector
 * @param v_out_length - How fast the ball will be after the shot in team coordinates
 * @param ballSpeed - How fast the ball will be when hitting the robot (futureBall.speed)
 * @param phi - Orientation of the robot
 * @param robotSpeed - Velocity of the robot when hitting the ball
 * @param robotId - The robot that is going to shoot or "opp" for opponent / unknown robots
 * @returns x,y - The velocity of the shot ball is Vector(x,y) (in team coordinates)
 */
export function calcVOutTeamCoordinates(v_out_length: number, ballSpeed: Speed, phi: number,
		robotSpeed: Speed, robotId: number | "opp"): [number, number] {
	let relativeSpeed = ballSpeed - robotSpeed;
	let [v_refl_x, v_refl_y] = calcVOutFromVS(0, relativeSpeed.length(), phi, relativeSpeed.angle(), robotId);
	let sinp = Math.sin(phi);
	let cosp = Math.cos(phi);
	// calcVOut(x,v_in, phi, alpha) = cosp * x + v_refl_x, sinp * x + v_refl_y
	// calcVOut returns velocity relative to robotSpeed, so to get the speed in team coordinates, one has to add robotSpeed
	// so we want to find x, so that (new Vector(cosp * x + v_refl_x, sinp * x + v_refl_y) + robotSpeed).length() = v_out_length
	// first, simplify vector addition: Vector(cosp * x + v_refl_glob_x, sinp * x + v_refl_glob_y).length() = v_out_length
	let v_refl_glob_x = v_refl_x + robotSpeed.x;
	let v_refl_glob_y = v_refl_y + robotSpeed.y;
	// wolphramalpha: sqrt((cos(p)*x+b)^2 + (sin(p)*x+d)^2)-v = 0 solve for x
	// tells you x = (sqrt((2 b cos(p) + 2 d sin(p))^2 - 4 (b^2 + d^2 - v^2) (sin^2(p) + cos^2(p))) - 2 b cos(p) - 2 d sin(p))/(2 (sin^2(p) + cos^2(p)))
	// using sin^2(p) + cos^2(p) = 1, that simplifies to
	// x = (sqrt((2 b cos(p) + 2 d sin(p))^2 - 4 (b^2 + d^2 - v^2)) - 2 b cos(p) - 2 d sin(p))/2
	let b = v_refl_glob_x;
	let d = v_refl_glob_y;
	let bcos = b * cosp;
	let dsin = d * sinp;
	let sqrt1 = 2 * bcos + 2 * dsin;
	sqrt1 = sqrt1 * sqrt1;
	let sqrt2 = -4 * (b * b + d * d - v_out_length * v_out_length);
	let v_s = 0.5 * (Math.sqrt(sqrt1 + sqrt2) - 2 * bcos - 2 * dsin);
	let x_res = cosp * v_s + v_refl_glob_x;
	let y_res = sinp * v_s + v_refl_glob_y;
	// TODO: remove these sanity checks if they don't fail for a while
	{
		let [x,y] = calcVOutFromVS(v_s, relativeSpeed.length(), phi, relativeSpeed.angle(), robotId);
		x = x + robotSpeed.x;
		y = y + robotSpeed.y;
		if (Math.abs(Math.sqrt(x * x + y * y) - v_out_length) > 1e-5
				|| Math.abs(x - x_res) > 1e-5
				|| Math.abs(y - y_res) > 1e-5) {
			throw new Error("Volley sanitity check failed!");
		}
	}
	return [x_res, y_res];
}

/**
 * Calculates vOut from known v_out_length, orientation and future ball.
 * @param v_out_length - How fast the ball will be after the shot
 * @param v_in - How fast the ball approaches the robot (futureBall.relativeSpeed.length())
 * @param phi - Orientation of the robot
 * @param alpha - Angle of relative ball speed (futureBall.relativeSpeed.angle())
 * @param robotId - The robot that is going to shoot or "opp" for opponent / unknown robots
 * @returns x,y - The velocity of the shot ball relative to the robot's velocity is Vector(x,y)
 */
export function calcVOutFromVOutAbs(v_out_length: number, v_in: number, phi: number, alpha: number, robotId: number | "opp"): [number, number] {
	let [v_refl_x, v_refl_y] = calcVOutFromVS(0, v_in, phi, alpha, robotId);
	let sinp = Math.sin(phi);
	let cosp = Math.cos(phi);
	// calcVOut(x,v_in,phi,alpha) = cosp * x + v_refl_x, sinp * x + v_refl_y
	// we want to find x, so that Vector(cops * x + v_refl_x, sinp * x + v_refl_y).length() = v_out_length
	// wolphramalpha: sqrt((cos(p)*x+b)^2 + (sin(p)*x+d)^2)-v = 0 solve for x
	// tells you x = (sqrt((2 b cos(p) + 2 d sin(p))^2 - 4 (b^2 + d^2 - v^2) (sin^2(p) + cos^2(p))) - 2 b cos(p) - 2 d sin(p))/(2 (sin^2(p) + cos^2(p)))
	// using sin^2(p) + cos^2(p) = 1, that simplifies to
	// x = (sqrt((2 b cos(p) + 2 d sin(p))^2 - 4 (b^2 + d^2 - v^2)) - 2 b cos(p) - 2 d sin(p))/2
	let bcos = v_refl_x * cosp;
	let dsin = v_refl_y * sinp;
	let sqrt1 = 2 * bcos + 2 * dsin;
	sqrt1 = sqrt1 * sqrt1;
	let sqrt2 = -4 * (v_refl_x * v_refl_x + v_refl_y * v_refl_y - v_out_length * v_out_length);
	let v_s = 0.5 * Math.sqrt(sqrt1 + sqrt2) - bcos - dsin;
	return calcVOutFromVS(v_s, v_in, phi, alpha, robotId);
}

/**
 * Calculates vOut from known v_s, orientation and future ball.
 * @see doc/volley.txt for extended documentation
 * @param v_s - How fast would the ball be if shot while resting relative to the robot(shotBall.relativeSpeed.length())
 * @param v_in - How fast the ball approches the robot (futureBall.relativeSpeed.length())
 * @param phi - Orientation of the robot
 * @param alpha - Angle of relative ball speed (futureBall.relativeSpeed.angle())
 * @param robotId - The robot that is going to shoot or "opp" for opponent / unknown robots
 * @returns x,y - The velocity of the shot ball relative to the robot's velocity is Vector(x,y)
 */
export function calcVOutFromVS(v_s: number, v_in: number, phi: number, alpha: number, robotId: number | "opp"): [number, number] {
	if (World.WorldStateSource !== pb.world.WorldSource.INTERNAL_SIMULATION && (robotId < 0 || robotId > 15)) {
		throw new Error("Invalid robot id");
	}
	v_in = bound(0, v_in, Constants.maxBallSpeed);
	let sinp = Math.sin(phi);
	let cosp = Math.cos(phi);
	let sinpa = Math.sin(phi - alpha);
	let cospa = Math.cos(phi - alpha);

	const damping = getDampingParam(<DampingIndex> robotId);
	let x = cosp * v_s + sinp * sinpa * damping.mu_x * v_in - cosp * cospa * damping.mu_y * v_in;
	let y = sinp * v_s - cosp * sinpa * damping.mu_x * v_in - sinp * cospa * damping.mu_y * v_in;

	return [x, y];
}

function volley_Jf(v_s: number, phi: number, alpha: number, v_in: number,
		robotId: number | "opp"): [number, number, number, number] {
	if (World.WorldStateSource !== pb.world.WorldSource.INTERNAL_SIMULATION && (robotId < 0 || robotId > 15)) {
		throw new Error("Invalid robot id");
	}
	let sinp = Math.sin(phi);
	let cosp = Math.cos(phi);
	let sinpa = Math.sin(phi - alpha);
	let cospa = Math.cos(phi - alpha);

	const damping = getDampingParam(<DampingIndex> robotId);
	let xdv_s = cosp;
	let xdphi = -sinp * v_s + (damping.mu_x + damping.mu_y) * v_in * (cosp * sinpa + sinp * cospa);
	let ydv_s = sinp;
	let ydphi = cosp * v_s - (damping.mu_x + damping.mu_y) * v_in * (cosp * cospa - sinp * sinpa);

	return [xdv_s, xdphi, ydv_s, ydphi];
}

/**
 * Calculates robot orientation and v_s, given a futurBall and a target and targetSpeed
 * @param robot
 * @param ballSpeed - The ball's speed when it touches the dribbler (global speed)
 * @param viewPos - The ball's position when it touches the dribbler
 * @param targetPos - The desired position to shoot at
 * @param targetSpeed - The desired speed for the ball when reaching targetPos
 * @returns phi, v_s
 * @returns phi The orientation of the robot to perform that shot
 * @returns v_s @see calcVOutFromVS
 */
export function calcPhi(robot: FriendlyRobot, ballSpeed: Speed, viewPos: Position, targetPos: Position,
		targetSpeed: number, volleyObserver?: VolleyObserver): [number, number] {
	// relative ball speed
	ballSpeed =  ballSpeed - robot.speed; // FIXME: future robot speed not current robot speed
	let v_in = ballSpeed.length();
	let alpha = ballSpeed.angle();

	// calculate required shoot speed
	let dist = targetPos.distanceTo(viewPos);
	let abs_v_out = robot.calculateShootSpeed(targetSpeed, dist);
	if (targetSpeed === Infinity) { // FIXME: Robocup HACK. Necessary would be a detection that increases abs_v_out by a value, because we can rely on some reflection-speed. Only v_s is limited by this._robot.maxShotLinear.
		abs_v_out = robot.maxShotLinear + DEFAULT_DAMPING_FACTOR.mu_y * v_in; // FIXME: This calculation is bullshit
	}
	abs_v_out = Math.min(Constants.maxBallSpeed, abs_v_out);
	if (volleyObserver != undefined) {
		let ball = { pos: viewPos, speed: (targetPos - viewPos).withLength(abs_v_out), radius: World.Ball.radius,
			maxSpeed: abs_v_out };
		let expectedTargetSpeed = Physics.ballAtTime(ball, Physics.ballRollTime(ball, dist)).speed.length();
		volleyObserver(ballSpeed, viewPos, targetPos, expectedTargetSpeed);
	}

	// relative output speed
	let v_out = (targetPos - viewPos).withLength(abs_v_out) - robot.speed;

	// guess initial values for v_s and phi
	let v_s = abs_v_out;
	let phi = (targetPos - viewPos).angle();
	// caching
	let calcVOut = calcVOutFromVS;
	let robotId = robot.id;
	let visData: number[] = [];

	for (let i = 1;i <= 5;i++) {
		let [j11, j12, j21, j22] = volley_Jf(v_s, phi, alpha, v_in, robotId);
		let det = j11 * j22 - j21 * j12;
		let k11 = j22 / det;
		let k12 = -j12 / det;
		let k21 = -j21 / det;
		let k22 = j11 / det;

		let [fx, fy] = calcVOut(v_s, v_in, phi, alpha, robotId);
		fx = fx - v_out.x;
		fy = fy - v_out.y;

		let v_s_new = v_s - (k11 * fx + k12 * fy);
		let phi_new = phi - (k21 * fx + k22 * fy);

		v_s = v_s_new;
		phi = phi_new;

		// avoid negative shoot speed by inverting the angle
		if (v_s < 0) {
			v_s = -v_s;
			phi = phi + Math.PI;
		}

		// clamp the angle (stitch is towards own goal)
		if (phi > 3 / 2 * Math.PI) {
			phi = phi - 2 * Math.PI;
		} else if (phi < -1 / 2 * Math.PI) {
			phi = phi + 2 * Math.PI;
		}

		visData.push(phi);
	}
	// don't block the jit by calling c code
	for (let visPhi of visData) {
		vis.addPath("t/a/volley: Iterations",
				[robot.pos, robot.pos + Vector.fromPolar(visPhi, 100)],
				vis.colors.greenHalf);
	}

	let baseAngle = (targetPos - viewPos).angle();
	if (Math.abs(geom.getAngleDiff(baseAngle, phi)) > Math.PI / 2) {
		// FIXME: correct fallback for wrong direction
		// Angle differs more than 90 degrees from the base angle
		// this is only possible if v_s was negative
		return [geom.normalizeAngle(phi + Math.PI), 0];
	}
	return [phi, v_s];
}
