import { Coordinates } from "base/coordinates";
import { BallInfo, moveObjects, sendRefereeCommand } from "base/debugcommands";
import * as pb from "base/protobuf";
import { FriendlyRobot, Robot, RobotState } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { END_DISTANCE, PlaceBall } from "glados/task/attacker/placeball";
import { Halt } from "glados/task/shared/halt";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as PathHelper from "glados/trajectory/pathhelper";

export abstract class HardwareChallengeBase extends Move {
	public static MIN_ROBOTS: number = 1;
	public static MAX_ROBOTS: number = 1;
	public static ALLOW_EXTRA_ATTACKERS = false;

	// override with specific challenge
	protected challengeNumber: 1 | 2 | 3 | 4 | undefined = undefined;

	private friendlyTransforms: RobotState[];
	private opponentTransforms: RobotState[];
	private ballPos: BallInfo;
	private initialized: boolean = false;
	private refHalt: boolean = false;
	private refStart: boolean = false;
	private currentObstacleToSet: number = 0;

	// only necessary to not spam log messages
	private numberOfInsufficientFriendlyRobots: number = -1;
	private numberOfInsufficientOpponentRobots: number = -1;

	// any type meaning any of the scenarios in scenarios.ts from the JSONs
	constructor(robots: FriendlyRobot[], messaging: MessageBox, positions: any) {
		super(robots, messaging);

		PathHelper.setHardwareChallenge(0);

		let ball = positions.ball;

		// third entry of pos is angle, which doesn't make sense for ball
		this.ballPos = {
			// necessary transformation, because moveObjects assumes local coordinates
			pos: Coordinates.fromVision(new Vector(ball.pos[0], ball.pos[1])),
			posZ: 0,
			speed: new Vector(0, 0),
			speedZ: 0,
		};

		let yellowRobots = positions.bots.filter((x: any) =>  x.id.color === "YELLOW");
		let blueRobots = positions.bots.filter((x: any) =>  x.id.color === "BLUE");

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
			this.friendlyTransforms = blueTransforms;
			this.opponentTransforms = yellowTransforms;
		} else {
			this.friendlyTransforms = yellowTransforms;
			this.opponentTransforms = blueTransforms;
		}
	}

	public static canStart() {
		return true;
	}

	public _canContinue() {
		return true;
	}

	// override this method
	// is called in updateTasks after everything is initialized
	protected abstract challengeSpecificUpdateTask(): MoveParameters;

	private static compareRobotToState(robot: Robot, transform: RobotState) {
		let angleDiff = Math.abs(robot.dir - transform.dir);
		const LOW = (5 / 180) * Math.PI;
		const HIGH = 2.0 * Math.PI - LOW;
		return (robot.pos - transform.pos).length() < 0.05 && (angleDiff < LOW || angleDiff > HIGH);
	}

	private placeOpponents(): MoveParameters | undefined {
		if (this.currentObstacleToSet >= this.opponentTransforms.length) {
			return undefined;
		}

		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		let transform = this.opponentTransforms[this.currentObstacleToSet];
		let obstacleInPosition = false;
		for (let robot of World.OpponentRobots) {
			if (HardwareChallengeBase.compareRobotToState(robot, transform)) {
				obstacleInPosition = true;
				break;
			}
		}

		if (obstacleInPosition) {
			this.currentObstacleToSet += 1;
		}

		if (this.currentObstacleToSet >= this.opponentTransforms.length) {
			return undefined;
		}

		transform = this.opponentTransforms[this.currentObstacleToSet];
		let dir = transform.dir + Math.PI;
		if (dir > 2.0 * Math.PI) {
			dir -= 2.0 * Math.PI;
		}
		let radius = this._robots[0].radius;
		if (this._robots[0].centerToDribbler != undefined) {
			radius = this._robots[0].centerToDribbler;
		}
		let pos = transform.pos + Vector.fromAngle(transform.dir) * 2.0 * radius;
		taskAssignments[this._robots[0]] = Assignment.create({
			class: MoveToPos,
			params: [{pos: pos, dir: dir, endSpeedLength: 0}],
			// restart if obstacle changed
			restart: obstacleInPosition
		});

		// avoid other robots dropping out of move
		for (let i = 1; i < this._robots.length; ++i) {
			taskAssignments[this._robots[i]] = Assignment.create({
				class: Halt
			});
		}
		return {assignments: taskAssignments};
	}

	private placeBall(): MoveParameters | undefined {
		if ((World.Ball.pos - this.ballPos.pos).length() < END_DISTANCE
			&& World.Ball.speed.length() < 0.1) {
			return undefined;
		}
		let taskAssignments = new Map<FriendlyRobot, Assignment>();
		taskAssignments[this._robots[0]] = Assignment.create({
			class: PlaceBall,
			params: [this.ballPos.pos],
			restart: false
		});

		// avoid other robots dropping out of move
		for (let i = 1; i < this._robots.length; ++i) {
			taskAssignments[this._robots[i]] = Assignment.create({
				class: Halt
			});
		}
		return {assignments: taskAssignments};
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

	public readonly _updateTasks: (() => MoveParameters) = () => {

		if (this.initialized) {
			if (!this.refHalt && World.RefereeState === "Halt") {
				this.refHalt = true;
				PathHelper.setHardwareChallenge(this.challengeNumber);
				amun.log("Finished initialization.");
			}

			if (this.refHalt && World.RefereeState !== "Halt") {
				this.refStart = true;
			}
			if (this.refStart) {
				return this.challengeSpecificUpdateTask();
			} else {
				return this.haltAllRobots();
			}
		}

		if (World.WorldStateSource === pb.world.WorldSource.INTERNAL_SIMULATION && amun.isDebug) {
			// use existing ids for each team (e.g. team yellow might not have a robot with id 0 as in the JSON)
			let numberFriendlies = Math.min(this.friendlyTransforms.length, this._robots.length);
			let blueRobots: RobotState[] = [];
			for (let i = 0; i < numberFriendlies; ++i) {
				let transform = this.friendlyTransforms[i];
				transform.id = this._robots[i].id;
				blueRobots.push(transform);
			}

			let numberOpponents = Math.min(this.opponentTransforms.length, World.OpponentRobots.length);
			let yellowRobots: RobotState[] = [];
			for (let i = 0; i < numberOpponents; ++i) {
				let transform = this.opponentTransforms[i];
				transform.id = World.OpponentRobots[i].id;
				yellowRobots.push(transform);
			}

			moveObjects(this.ballPos, blueRobots, yellowRobots);

			if (this.friendlyTransforms.length <= this._robots.length && this.opponentTransforms.length <= World.OpponentRobots.length) {
				this.initialized = true;
				sendRefereeCommand("Halt");
			} else {
				if (this._robots.length !== this.numberOfInsufficientFriendlyRobots || World.OpponentRobots.length !== this.numberOfInsufficientOpponentRobots) {
					this.numberOfInsufficientFriendlyRobots = this._robots.length;
					this.numberOfInsufficientOpponentRobots = World.OpponentRobots.length;
					amun.log("Not enough robots. Friendly robots present:\n", this._robots.length, "/", this.friendlyTransforms.length, "\n",
							"Opponent robots present: ",World.OpponentRobots.length, "/", this.opponentTransforms.length);
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
		let everyoneInPosition = true;
		for (let i = 0; i < this.friendlyTransforms.length; ++i) {
			let transform = this.friendlyTransforms[i];
			everyoneInPosition = everyoneInPosition && HardwareChallengeBase.compareRobotToState(this._robots[i], transform);

			taskAssignments[this._robots[i]] = Assignment.create({
				class: MoveToPos,
				params: [{pos: transform.pos, dir: transform.dir, endSpeedLength: 0}],
				restart: true
			});
		}

		// avoid other robots dropping out of move
		for (let i = this.friendlyTransforms.length; i < this._robots.length; ++i) {
			taskAssignments[this._robots[i]] = Assignment.create({
				class: Halt
			});
		}

		this.initialized = everyoneInPosition;
		if (this.initialized) {
			if (amun.isDebug) {
				sendRefereeCommand("Halt");
			} else {
				amun.log("Press Halt to finish initialization.");
			}
		}
		return {assignments: taskAssignments};
	}

	protected reset() {
		this.initialized = false;
		this.refHalt = false;
		this.refStart = false;
		PathHelper.setHardwareChallenge(0);
	}
}
