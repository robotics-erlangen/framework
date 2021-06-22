import * as debug from "base/debug";
import * as DebugCommands from "base/debugcommands";
import { FriendlyRobot, RobotState } from "base/robot";
import { Position, Speed, Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { Assignment, MessageBox, Move, MoveParameters } from "glados/group/move/base";
import * as ObserverBall from "glados/observer/ball";
import { Halt } from "glados/task/shared/halt";
import { MoveToPos } from "glados/task/shared/movetopos";
import { visualizeAttack } from "glados/util/attack";
import * as UtilVolley from "glados/util/volley";

const asRad = (deg: number) => deg * Math.PI / 180;

enum Stage {
	Setup,
	WaitForShot,
	Shot,
}

interface Configuration {
	initialBallSpeed: number;
	inputAngle: number;
	shootSpeed: number;
}

const INITIAL_BALL_SPEEDS = [ 3, 4, 5, 6 ];
const INPUT_ANGLE = [ 50, 55, 60, 65, 70, 75, 80, 85, 90 ].map(asRad);
const SHOOT_SPEED = [ 5, 5.5, 6, 6.5 ];

interface VolleyInformation {
	speedAtRobot: number;
	ballSpeedInAngle: number;
	shootSpeed: number;
	robotAngle: number;
	ballSpeedOutAngle: number;
}

let done = false;

export class Volley extends Move {
	static MIN_ROBOTS = 1;
	static MAX_ROBOTS = 1;
	static ALLOW_EXTRA_ATTACKERS = false;

	private _state: {
		stage: Stage.Setup,
	} | {
		stage: Stage.WaitForShot,
		speedAtDribbler?: Speed,
	} | {
		stage: Stage.Shot,
		speedAtDribbler: Speed,
	} = { stage: Stage.Setup };

	private _stageChangeTime = World.Time;

	private _configs: Configuration[] = [];
	private _currentConfig: number;

	constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging);

		for (const inputAngle of INPUT_ANGLE) {
			for (const initialBallSpeed of INITIAL_BALL_SPEEDS) {
				for (const shootSpeed of SHOOT_SPEED) {
					this._configs.push({
						initialBallSpeed,
						inputAngle,
						shootSpeed,
					});
				}
			}
		}
		if (this._configs.length < 1) {
			throw new Error("No input configurations");
		}
		this._currentConfig = 0;
	}

	static canStart(): boolean {
		return !done;
	}

	_canContinue(): boolean {
		done = this._currentConfig >= this._configs.length;
		return !done;
	}

	_updateTasks(): MoveParameters {
		const assignments = new Map<FriendlyRobot, Assignment>();
		debug.set("state", this._state);
		debug.set("state/stage", Stage[this._state.stage]);

		const timeInState = World.Time - this._stageChangeTime;
		debug.set("timeInState", timeInState);

		const shooter = this._robots[0];

		const passDistance = 3.5;

		const config = this._configs[this._currentConfig];
		const { initialBallSpeed, inputAngle, shootSpeed } = config;

		debug.set("config", config);

		// Perform current action
		switch (this._state.stage) {
			case Stage.Setup: {
				const ballPos = Vector.fromPolar(inputAngle, passDistance);
				const ballSpeed = ballPos
					.rotated(asRad(180))
					.withLength(initialBallSpeed);

				const shooterPos = new Vector(0, -shooter.shootRadius - World.Ball.radius);

				DebugCommands.moveObjects(
					{ pos: ballPos, speed: ballSpeed },
					[
						{
							id: shooter.id,
							pos: shooterPos,
							speed: new Vector(0, 0),
							dir: asRad(90),
							angularSpeed: 0,
						},
					],
				);

				assignments[shooter] = Assignment.create({ class: Halt });
				break;
			}
			case Stage.WaitForShot:
				if (!this._state.speedAtDribbler
						&& World.Ball.pos.distanceTo(shooter.dribblerPos) < World.Ball.radius + 0.10) {
					this._state.speedAtDribbler = World.Ball.speed;
				}

				shooter.shoot(shootSpeed, true);
				assignments[shooter] = Assignment.create({
					class: MoveToPos,
					params: [{ pos: shooter.pos }],
				});
				break;
			case Stage.Shot:
				assignments[shooter] = Assignment.create({ class: Halt });
				break;
		}

		// Get next stage
		let nextState: Volley["_state"];
		switch (this._state.stage) {
			case Stage.Setup:
				nextState = {
					stage: Stage.WaitForShot,
					speedAtDribbler: undefined,
				};
				break;
			case Stage.WaitForShot:
				if (ObserverBall.wasShot(0.2)) {
					if (this._state.speedAtDribbler === undefined) {
						throw new Error("speedAtDribbler not set");
					}
					nextState = {
						stage: Stage.Shot,
						speedAtDribbler: this._state.speedAtDribbler,
					};
				} else {
					nextState = this._state;
				}

				break;
			case Stage.Shot:
				const { speedAtDribbler } = this._state;
				const vout = UtilVolley.calcVOutFromVS(config.shootSpeed, speedAtDribbler.length(), shooter.dir, speedAtDribbler.angle(), shooter.id);
				vis.addPath("expected ball dir", [shooter.pos, shooter.pos + (new Vector(vout[0], vout[1])) * 10], vis.colors.red);
				// Wait a bit until taking a measurement for stability
				if (World.Ball.pos.distanceTo(shooter.pos) < 5) {
					nextState = this._state;
					break;
				}

				const measurement: VolleyInformation = {
					robotAngle: shooter.dir,
					shootSpeed,
					speedAtRobot: speedAtDribbler.length(),
					ballSpeedInAngle: speedAtDribbler.angle(),
					ballSpeedOutAngle: World.Ball.speed.angle(),
				};

				const fields = [
					`robotAngle: ${measurement.robotAngle}`,
					`shootSpeed: ${measurement.shootSpeed}`,
					`speedAtRobot: ${measurement.speedAtRobot}`,
					`ballSpeedInAngle: ${measurement.ballSpeedInAngle}`,
					`ballSpeedOutAngle: ${measurement.ballSpeedOutAngle}`,
				].join(", ");
				amun.log(`{ ${fields} },`);

				this._currentConfig++;
				nextState = { stage: Stage.Setup };
				break;
		}

		if (nextState.stage !== this._state.stage) {
			this._stageChangeTime = World.Time;
		}
		this._state = nextState;

		return { assignments };
	}
}

