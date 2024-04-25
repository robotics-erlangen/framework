import { Coordinates } from "base/coordinates";
import { BallInfo, moveObjects, sendRefereeCommand } from "base/debugcommands";
import * as geom from "base/geom";
import { Obstacle } from "base/path";
import * as pb from "base/protobuf";
import { FriendlyRobot, Robot, RobotState } from "base/robot";
import { Vector } from "base/vector";
import * as vis from "base/vis";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { END_DISTANCE, PlaceBall } from "glados/task/attacker/placeball";
import { Halt } from "glados/task/shared/halt";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as PathHelper from "glados/trajectory/pathhelper";

export abstract class HardwareChallengeBase extends Move {
	public static readonly MIN_ROBOTS: number = 1;
	public static readonly MAX_ROBOTS: number = 1;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	// override with specific challenge
	protected _challengeNumber: 1 | 2 | 3 | 4 | undefined = undefined;

	protected _friendlyTransforms: RobotState[];
	protected _opponentTransforms: RobotState[];
	private _ballPos: BallInfo;
	private static _initialized: boolean = false;
	private static _refHalt: boolean = false;
	private static _refStart: boolean = false;
	private _currentObstacleToSet: number = 0;

	// only necessary to not spam log messages
	private _numberOfInsufficientFriendlyRobots: number = -1;
	private _numberOfInsufficientOpponentRobots: number = -1;

	private _friendlyInitialized: boolean[];
	private _opponentInitialized: boolean[];
	private _ballInitialized: boolean = false;

	// any type meaning any of the scenarios in scenarios.ts from the JSONs
	public constructor(robots: FriendlyRobot[], messaging: MessageBox, positions: any) {
		super(robots, messaging);

		PathHelper.setHardwareChallenge(0);

		let ball = positions.ball;

		// third entry of pos is angle, which doesn't make sense for ball
		this._ballPos = {
			// necessary transformation, because moveObjects assumes local coordinates
			pos: Coordinates.fromVision(new Vector(ball.pos[0], ball.pos[1])),
			posZ: 0,
			speed: new Vector(0, 0),
			speedZ: 0,
		};

		let yellowRobots = positions.bots.filter((x: any) => x.id.color === "YELLOW");
		let blueRobots = positions.bots.filter((x: any) => x.id.color === "BLUE");

		let getTransform: ((jsonBot: any) => RobotState) = (jsonBot) => {
			// necessary transformation, because moveObjects assumes local coordinates
			let pos = Coordinates.fromVision(new Vector(jsonBot.obj.pos[0], jsonBot.obj.pos[1]));
			let angle = Coordinates.fromVision(<number> jsonBot.obj.pos[2]);
			return {
				id: 0,
				pos: pos,
				dir: angle,
				speed: new Vector(0, 0),
				angularSpeed: 0,
			};
		};

		let yellowTransforms = yellowRobots.map(getTransform);
		let blueTransforms = blueRobots.map(getTransform);

		if (World.TeamIsBlue) {
			this._friendlyTransforms = blueTransforms;
			this._opponentTransforms = yellowTransforms;
		} else {
			this._friendlyTransforms = yellowTransforms;
			this._opponentTransforms = blueTransforms;
		}

		this._friendlyInitialized = this._friendlyTransforms.map((_) => false);
		this._opponentInitialized = this._opponentTransforms.map((_) => false);
	}

	public static canStart() {
		return true;
	}

	public canContinue(): boolean {
		return true;
	}

	// override this method
	// is called in updateTasks after everything is initialized
	protected abstract challengeSpecificUpdateTask(): MoveParameters;

	private static compareRobotToState(robot: Robot, transform: RobotState, previouslyCorrect: boolean) {
		const angleDiff = Math.abs(robot.dir - transform.dir);

		// hysteresis
		const allowedAngleError = previouslyCorrect ? 6 : 4;
		const maxDistance = previouslyCorrect ? 0.05 : 0.02;

		const LOW = geom.degreeToRadian(allowedAngleError);
		const HIGH = 2.0 * Math.PI - LOW;
		return (robot.pos - transform.pos).length() < maxDistance && (angleDiff < LOW || angleDiff > HIGH);
	}

	private placeOpponents(): MoveParameters | undefined {
		if (this._currentObstacleToSet >= this._opponentTransforms.length) {
			return undefined;
		}

		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		let transform = this._opponentTransforms[this._currentObstacleToSet];
		let resetMoveToPos = false;
		let everyoneInPosition = true;
		for (let i = 0; i < this._opponentTransforms.length; ++i) {
			let transform = this._opponentTransforms[i];
			let previouslyCorrect = this._opponentInitialized[i];
			let obstacleInPosition = false;
			for (let robot of World.OpponentRobots) {
				if (HardwareChallengeBase.compareRobotToState(robot, transform, previouslyCorrect)) {
					obstacleInPosition = true;
					break;
				}
			}
			if (!obstacleInPosition) {
				resetMoveToPos = this._currentObstacleToSet !== i;
				this._currentObstacleToSet = i;
				this._opponentInitialized[i] = false;
				everyoneInPosition = false;
				break;
			}
			this._opponentInitialized[i] = true;
		}

		if (everyoneInPosition) {
			return undefined;
		}

		transform = this._opponentTransforms[this._currentObstacleToSet];
		let dir = transform.dir + Math.PI;
		if (dir > 2.0 * Math.PI) {
			dir -= 2.0 * Math.PI;
		}
		let radius = this._robots[0].radius;
		if (this._robots[0].centerToDribbler != undefined) {
			radius = this._robots[0].centerToDribbler;
		}
		let pos = transform.pos + Vector.fromAngle(transform.dir) * 2.0 * radius;

		let customObstacles: Obstacle[] = [];
		for (let i = 0; i < this._opponentTransforms.length; ++i) {
			if (i === this._currentObstacleToSet) {
				continue;
			}

			let obstacleTransform = this._opponentTransforms[i];
			let obstacleName: string = `opponentObstacle${i}`;
			customObstacles.push({
				type: "circle",
				center: obstacleTransform.pos,
				radius: this._robots[0].radius * 1.05,
				name: obstacleName
			});
		}

		for (let i = 1; i < this._friendlyTransforms.length; ++i) {
			let obstacleTransform = this._friendlyTransforms[i];
			let obstacleName: string = `friendlyObstacle${i}`;
			customObstacles.push({
				type: "circle",
				center: obstacleTransform.pos,
				radius: this._robots[0].radius * 1.05,
				name: obstacleName
			});
		}

		customObstacles.push({
			type: "circle",
			center: World.Ball.pos,
			radius: World.Ball.radius + 0.005,
			name: "ballObstacle"
		});


		taskAssignments[this._robots[0]] = Assignment.create({
			class: MoveToPos,
			params: [{ pos: pos, dir: dir, endSpeedLength: 0, customObstacles: customObstacles }],
			// restart if obstacle changed
			restart: resetMoveToPos
		});

		this.assignFriendlyMoves(1, taskAssignments);
		return { assignments: taskAssignments };
	}

	private placeBall(): MoveParameters | undefined {
		let maxDistance = END_DISTANCE;

		// hysteresis
		if (this._ballInitialized) {
			maxDistance += 0.02;
		}

		if (World.Ball.isPositionValid() && (World.Ball.pos - this._ballPos.pos).length() < maxDistance
			&& World.Ball.speed.length() < 0.1) {
			this._ballInitialized = true;
			return undefined;
		}
		this._ballInitialized = false;
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		taskAssignments[this._robots[0]] = Assignment.create({
			class: PlaceBall,
			params: [this._ballPos.pos],
			restart: false
		});

		this.assignFriendlyMoves(1, taskAssignments);
		return { assignments: taskAssignments };
	}

	private assignFriendlyMoves(startIndex: number, taskAssignments: Map<FriendlyRobot, Assignment>): boolean {
		let everyoneInPosition = true;

		let customObstacles: Obstacle[] = [];
		for (let i = 0; i < this._opponentTransforms.length; ++i) {
			let obstacleTransform = this._opponentTransforms[i];
			let obstacleName: string = `opponentObstacle${i}`;
			customObstacles.push({
				type: "circle",
				center: obstacleTransform.pos,
				radius: this._robots[0].radius * 1.05,
				name: obstacleName
			});
		}

		customObstacles.push({
			type: "circle",
			center: World.Ball.pos,
			radius: World.Ball.radius + 0.005,
			name: "ballObstacle"
		});
		for (let i = startIndex; i < this._friendlyTransforms.length; ++i) {
			let transform = this._friendlyTransforms[i];
			this._friendlyInitialized[i] = HardwareChallengeBase.compareRobotToState(this._robots[i], transform, this._friendlyInitialized[i]);
			everyoneInPosition = everyoneInPosition && this._friendlyInitialized[i];

			taskAssignments[this._robots[i]] = Assignment.create({
				class: MoveToPos,
				params: [{ pos: transform.pos, dir: transform.dir, endSpeedLength: 0, customObstacles: customObstacles }],
				restart: true
			});
		}

		// avoid other robots dropping out of move
		for (let i = this._friendlyTransforms.length; i < this._robots.length; ++i) {
			taskAssignments[this._robots[i]] = Assignment.create({
				class: Halt
			});
		}

		return everyoneInPosition;
	}

	private haltAllRobots(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		for (let robot of this._robots) {
			taskAssignments[robot] = Assignment.create({
				class: Halt
			});
		}

		return { assignments: taskAssignments };
	}

	private showVis() {
		for (let transform of this._opponentTransforms) {
			vis.addPizza("HWChallenge/ObstaclePosition", transform.pos, this._robots[0].radius, 2 * Math.PI + transform.dir - geom.degreeToRadian(20), transform.dir + geom.degreeToRadian(20), vis.colors.yellow, false);
		}
		for (let transform of this._friendlyTransforms) {
			vis.addPizza("HWChallenge/FriendlyPosition", transform.pos, this._robots[0].radius, 2 * Math.PI + transform.dir - geom.degreeToRadian(20), transform.dir + geom.degreeToRadian(20), vis.colors.blue, false);
		}
		vis.addCircle("HWChallenge/BallPosition", this._ballPos.pos, World.Ball.radius, vis.colors.mediumPurple, false);
	}

	public readonly _updateTasks: (() => MoveParameters) = () => {
		if (HardwareChallengeBase._initialized) {
			if (!HardwareChallengeBase._refHalt && World.RefereeState === "Halt") {
				HardwareChallengeBase._refHalt = true;
				PathHelper.setHardwareChallenge(this._challengeNumber);
				amun.log("Finished initialization.");
			}

			if (HardwareChallengeBase._refHalt && World.RefereeState !== "Halt") {
				HardwareChallengeBase._refStart = true;
			}
			if (HardwareChallengeBase._refStart) {
				return this.challengeSpecificUpdateTask();
			} else {
				this.showVis();
				return this.haltAllRobots();
			}
		}

		this.showVis();

		if (World.WorldStateSource() === pb.world.WorldSource.INTERNAL_SIMULATION && amun.isDebug) {
			// use existing ids for each team (e.g. team yellow might not have a robot with id 0 as in the JSON)
			let numberFriendlies = Math.min(this._friendlyTransforms.length, this._robots.length);
			let blueRobots: RobotState[] = [];
			for (let i = 0; i < numberFriendlies; ++i) {
				let transform = this._friendlyTransforms[i];
				transform.id = this._robots[i].id;
				blueRobots.push(transform);
			}

			let numberOpponents = Math.min(this._opponentTransforms.length, World.OpponentRobots.length);
			let yellowRobots: RobotState[] = [];
			for (let i = 0; i < numberOpponents; ++i) {
				let transform = this._opponentTransforms[i];
				transform.id = World.OpponentRobots[i].id;
				yellowRobots.push(transform);
			}

			moveObjects(this._ballPos, blueRobots, yellowRobots);

			if (this._friendlyTransforms.length <= this._robots.length && this._opponentTransforms.length <= World.OpponentRobots.length) {
				HardwareChallengeBase._initialized = true;
				sendRefereeCommand("Halt");
			} else {
				if (this._robots.length !== this._numberOfInsufficientFriendlyRobots || World.OpponentRobots.length !== this._numberOfInsufficientOpponentRobots) {
					this._numberOfInsufficientFriendlyRobots = this._robots.length;
					this._numberOfInsufficientOpponentRobots = World.OpponentRobots.length;
					amun.log("Not enough robots. Friendly robots present:\n", this._robots.length, "/", this._friendlyTransforms.length, "\n",
							"Opponent robots present: ", World.OpponentRobots.length, "/", this._opponentTransforms.length);
				}
			}

			return this.haltAllRobots();
		}

		let moveParameters: MoveParameters | undefined = this.placeOpponents();
		if (moveParameters != undefined) {
			return moveParameters;
		}

		moveParameters = this.placeBall();
		if (moveParameters != undefined) {
			return moveParameters;
		}


		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		HardwareChallengeBase._initialized = this.assignFriendlyMoves(0, taskAssignments);

		if (HardwareChallengeBase._initialized) {
			if (amun.isDebug) {
				sendRefereeCommand("Halt");
			} else {
				amun.log("Press Halt to finish initialization.");
			}
		}
		return { assignments: taskAssignments };
	};

	protected reset() {
		HardwareChallengeBase._initialized = false;
		HardwareChallengeBase._refHalt = false;
		HardwareChallengeBase._refStart = false;
		PathHelper.setHardwareChallenge(0);
	}
}
