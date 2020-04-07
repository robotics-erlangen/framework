import * as debug from "base/debug";
import * as Field from "base/field";
import * as MathUtil from "base/mathutil";
import { FriendlyRobot } from "base/robot";
import * as timing from "base/timing";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { Behavior, BehaviorConstructor } from "glados/agent/base/behavior";
import { Error as AgentError } from "glados/agent/shared/error";
import { Halt } from "glados/agent/shared/halt";
import { MoveCommand } from "glados/agent/shared/movecommand";
import { dumpMessages, MessageBox, MessageType, MessageTypeList, Messaging } from "glados/control/messaging";
import * as Ball from "glados/observer/ball";
import * as Physics from "glados/observer/physics";
import * as Robot from "glados/observer/robot";
import { Task } from "glados/task/base";
import * as UtilDefense from "glados/util/defense";
import * as Rating from "glados/util/rating";

let MEASURE_TIMING = false;
let MAX_RATING_TIME_BOOST = 0.1;

export abstract class Agent {
	_robot: FriendlyRobot;
	_messaging: MessageBox;
	_behaviors: Behavior[] = [];
	_activeBehavior: Behavior | undefined;
	_mainAttackerLastTime: number | undefined = undefined;
	_debugIdStr: string;

	private static _dumpAllTime: number = 0;

	// static method for pool
	abstract static takeRobot(_robots: FriendlyRobot[]): FriendlyRobot | undefined;

	constructor(robot: FriendlyRobot, messaging: Messaging) {
		this._robot = robot;
		this._messaging = messaging.registerAgent(this);
		// behaviors are ordered by decreasing priority
		this._behaviors = [
			new MoveCommand(this),
			new Halt(this),
			new AgentError(this),
			...this.getBehaviors().map((ctor) => new ctor(this)),
		];
		this._debugIdStr = "Agent " + this._robot.id;
	}

	abstract getBehaviors(): BehaviorConstructor[];

	_run() { }

	// for identificatio of agent like types, to avoid cyclic imports
	isAgent(): boolean {
		return true;
	}

	run() {
		debug.pushtop(this._debugIdStr);
		debug.set(undefined, this.constructor.name);
		this._dumpInbox();

		let task = this._runBehavior();
		this._runTask(task);
		this._applyForMainAttacker(task);
		this._run();

		debug.pop(); // Agent
	}

	_runBehavior(): Task | undefined {
		if (MEASURE_TIMING) {
			timing.start("Behavior check", this._robot.id);
		}

		// choose best behavior, that is the behavior with the highest priority of all useable ones
		let bestBehavior = undefined;
		for (let behavior of this._behaviors) {
			behavior.clearMainAttackerParameters();
			let result = behavior.check();
			if (result) {
				bestBehavior = result;
				break;
			}
		}
		// check if the behavior has changed
		if (bestBehavior !== this._activeBehavior) {
			if (this._activeBehavior) {
				this._activeBehavior.stop();
			}
			this._activeBehavior = bestBehavior;
			if (this._activeBehavior) {
				this._activeBehavior.start();
			}
		}

		if (MEASURE_TIMING) {
			timing.finish("Behavior check", this._robot.id);
			timing.start("Behavior run", this._robot.id);
		}

		// run behavior
		if (this._activeBehavior) {
			debug.set("Behavior", this._activeBehavior.constructor.name);
			this._activeBehavior.run();
		} else {
			debug.set("Behavior", "none");
		}

		if (MEASURE_TIMING) {
			timing.finish("Behavior run", this._robot.id);
		}

		return this._activeBehavior != undefined ? this._activeBehavior.task() : undefined;
	}

	_dumpInbox() {
		if (World.Time !== Agent._dumpAllTime) {
			Agent._dumpAllTime = World.Time;
			debug.pushtop("Global Inbox");
			for (const type of MessageTypeList) {
				dumpMessages(type, this._messaging.receiveAllInbox(type));
			}
			debug.pop(); // Global Inbox
		}
		debug.push("Inbox");
		for (const type of MessageTypeList) {
			dumpMessages(type, this._messaging.receiveNoBroadcast(type));
		}
		debug.pop(); // Inbox
	}

	_runTask(task: Task | undefined) {
		if (MEASURE_TIMING) {
			timing.start("Task", this._robot.id);
		}

		debug.push("Task");
		if (task != undefined) {
			debug.set(undefined, task.constructor.name);
			task.clearMainAttackerParameters();
			task.run();
		} else {
			debug.set(undefined, "none");
		}
		debug.pop(); // Task

		if (MEASURE_TIMING) {
			timing.finish("Task", this._robot.id);
		}
	}

	_applyForMainAttacker = debug.wrap("mainAttackerRating", (task: Task | undefined) => {
		// the keeper just overrides this
		let parameters = undefined;
		for (let behavior of this._behaviors) {
			const [behaviorParams, isActive] = behavior.mainAttackerParameters(this._activeBehavior);
			parameters = behaviorParams || parameters;
			if (isActive) {
				break;
			}
		}
		let overrideRating = parameters != undefined ? parameters[2] : undefined;
		if (parameters && task != undefined && overrideRating == undefined) {
			// only use task parameters if behavior asked for main attacker application
			parameters = task.mainAttackerParameters() || parameters;
		}
		if (parameters == undefined) {
			this._mainAttackerLastTime = undefined;
			debug.set("return case 1", true);
			return;
		}

		if (this._robot !== World.FriendlyKeeper && World.RefereeState !== "BallPlacementOffensive") {
			// only the keeper can apply for MA if it could touch the ball inside the defense area
			if (Field.isInFriendlyDefenseArea(this._robot.pos, this._robot.radius + World.Ball.radius + 0.02)
				&&  World.Ball.pos.y < this._robot.pos.y + this._robot.radius * 3) {
				debug.set("return case 2", true);
				return;
			}

			// only the keeper can apply for MA if the ball is behind the centerbacks
			if (Field.isInFriendlyDefenseArea(World.Ball.pos, World.Ball.radius + UtilDefense.centerBackDistanceToDefenseArea())) {
				debug.set("return case 3", true);
				return;
			}
		}

		let ratingArg = new Rating.LeveledRating(MessageType.mainAttacker);
		let mainAttackerRating: number;
		if (overrideRating == undefined) {
			let timeToBall = Robot.minTimeToBall(this._robot);
			let timeToBallDetailed: number | undefined = undefined;
			if (parameters[0] != undefined || parameters[1] != undefined) {
				let targetPos = parameters[0] || World.Geometry.OpponentGoal;
				let endSpeedLength = parameters[1] != undefined ? parameters[1] : this._robot.maxSpeed;
				timeToBallDetailed = Physics.robotTimeToBall(this._robot, World.Ball, targetPos, endSpeedLength, this._mainAttackerLastTime);
			}

			// if we have the ball, the time is 0
			if (timeToBall === Infinity || (timeToBallDetailed != undefined && timeToBallDetailed === Infinity)) {
				if (World.Ball.pos.distanceTo(this._robot.dribblerPos) < 0.15) {
					if (World.Ball.speed.dot(this._robot.pos - World.Ball.pos) > 0) {
						if (timeToBall === Infinity) {
							timeToBall = 0;
						}
						if (timeToBallDetailed != undefined && timeToBallDetailed === Infinity) {
							timeToBallDetailed = 0;
						}
					}
				}
			}

			if (timeToBall === Infinity) {
				let ballOutPos = Field.nextLineCut(World.Ball.pos, World.Ball.speed);
				if (ballOutPos && Math.abs(ballOutPos.x) > World.Geometry.DefenseWidthHalf  + World.Geometry.DefenseHeight) {
					timeToBall = Physics.robotTimeToPos(this._robot, ballOutPos, new Vector(0, 0))[0];
				}
			}

			let ballSpeedLength = World.Ball.speed.length();
			let ratingBoost;
			if (Ball.isSlowBall()) {
				// slow ball: being behind the ball is better
				let relativeYPos = World.Ball.pos.y - this._robot.pos.y;
				ratingBoost = Math.min(timeToBall / 2, Math.sin(MathUtil.bound(0, relativeYPos * Math.PI, Math.PI / 2)) * MAX_RATING_TIME_BOOST);
			} else {
				// fast ball: being in the direction of the ball is better
				let ballToRobot = this._robot.pos - World.Ball.pos;
				let ballToRobotLength = ballToRobot.length();
				let cosAngle = World.Ball.speed.dot(ballToRobot) / ballToRobotLength / ballSpeedLength;
				ratingBoost = cosAngle * cosAngle * cosAngle * ballSpeedLength * 0.5;
			}
			debug.set("slowBall", Ball.isSlowBall());
			debug.set("ratingBoost", ratingBoost);
			timeToBall = timeToBall - ratingBoost;
			if (timeToBallDetailed != undefined) {
				timeToBallDetailed = timeToBallDetailed - ratingBoost;
				ratingArg.setRating(1, Rating.timeToRating(timeToBallDetailed));
			}

			mainAttackerRating = Rating.timeToRating(timeToBall);
			ratingArg.setRating(0, mainAttackerRating);

		} else {
			mainAttackerRating = overrideRating;
			ratingArg.setRating(2, overrideRating);
		}
		// debug.push("Locals dump")
		// //debugger.dumpLocals(0)
		// debug.pop()
		debug.set("mainAttackerRating", ratingArg._ratingArray);
		this._messaging.sendToTrainerRepeated(MessageType.exclusiveRole, [ MessageType.mainAttacker, ratingArg]);
	});

	// controls whether the robot may be kept in its pool
	abstract keepRobot(): boolean;

	// rate robot for deciding which robots to keep in the pool
	// the robots with the lowest rating are removed until the robot limit is satisfied
	abstract rateRobot(): number;

	robot(): FriendlyRobot {
		return this._robot;
	}

	messaging(): MessageBox {
		return this._messaging;
	}
}
