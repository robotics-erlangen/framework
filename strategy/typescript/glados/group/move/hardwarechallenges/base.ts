import { Coordinates } from "base/coordinates";
import { BallInfo, moveObjects } from "base/debugcommands";
import { FriendlyRobot, Robot, RobotState } from "base/robot";
import { Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, Move, MoveParameters } from "glados/group/move/base";
import { PlaceBall } from "glados/task/attacker/placeball";
import { Halt } from "glados/task/shared/halt";
import { MoveToPos } from "glados/task/shared/movetopos";
import * as PathHelper from "glados/trajectory/pathhelper";

export abstract class HardwareChallengeBase extends Move {
	public static MIN_ROBOTS: number = 1;
	public static MAX_ROBOTS: number = 1;
	public static readonly ALLOW_EXTRA_ATTACKERS = false;

	// override this if the start command differs
	protected startState: World.RefereeStateType = "GameForce";

	private friendlyTransforms: RobotState[];
	private opponentTransforms: RobotState[];
	private ballPos: BallInfo;
	private initialized: boolean = false;
	private currentObstacleToSet: number = 0;

	// any type meaning any of the scenarios in scenarios.ts from the JSONs
	constructor(robots: FriendlyRobot[], messaging: MessageBox, positions: any) {
		super(robots, messaging);

		PathHelper.initHardwareChallenge();

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

		// use existing ids for each team (e.g. team yellow might not have a robot with id 0 as in the JSON)
		if (World.TeamIsBlue) {
			if (blueRobots.length > this._robots.length || yellowRobots.length > World.OpponentRobots.length) {
				amun.log("Not enough robots. Friendly robots present:\n", this._robots.length, "/", blueRobots.length, "\n",
						"Opponent robots present: ",World.OpponentRobots.length, "/", yellowRobots.length);
			}
			blueRobots = blueRobots.map((x: any, i: number) => [x, this._robots[i].id]);
			yellowRobots = yellowRobots.map((x: any, i: number) => [x, World.OpponentRobots[i].id]);
		} else {
			if (yellowRobots.length > this._robots.length || blueRobots.length > World.OpponentRobots.length) {
				amun.log("Not enough robots. Friendly robots present:\n", this._robots.length, "/", yellowRobots.length, "\n",
						"Opponent robots present: ",World.OpponentRobots.length, "/", blueRobots.length);
			}
			blueRobots = blueRobots.map((x: any, i: number) => [x, World.OpponentRobots[i].id]);
			yellowRobots = yellowRobots.map((x: any, i: number) => [x, this._robots[i].id]);
		}

		let getTransform: (([jsonBot, id]: [any, number]) => RobotState) = ([jsonBot, id]) => {
			// necessary transformation, because moveObjects assumes local coordinates
			let pos = Coordinates.fromVision(new Vector(jsonBot.obj.pos[0], jsonBot.obj.pos[1]));
			let angle = Coordinates.fromVision(<number> jsonBot.obj.pos[2]);
			return {
				id: id,
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

		if (World.IsSimulated && amun.isDebug) {
			moveObjects(this.ballPos, this.friendlyTransforms, this.opponentTransforms);
			this.initialized = true;
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
		return (robot.pos - transform.pos).length() < 0.005 && (angleDiff < LOW || angleDiff > HIGH);
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
		let dir = -transform.dir;
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
		if ((World.Ball.pos - this.ballPos.pos).length() < 0.05) {
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

	public readonly _updateTasks: (() => MoveParameters) = () => {
		if (this.initialized) {
			if (World.RefereeState === this.startState) {
				return this.challengeSpecificUpdateTask();
			} else {
				let taskAssignments = new Map<FriendlyRobot, Assignment>();
				for (let robot of this._robots) {
					taskAssignments[robot] = Assignment.create({
						class: Halt
					});
				}

				return { assignments: taskAssignments };
			}
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
			amun.log("Finished initialization.");
		}
		return {assignments: taskAssignments};
	}
}
