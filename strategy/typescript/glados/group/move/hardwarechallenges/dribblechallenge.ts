import { Obstacle } from "base/path";
import { FriendlyRobot } from "base/robot";
import { Position, Vector } from "base/vector";
import * as World from "base/world";

import { MessageBox } from "glados/control/messaging";
import { Assignment, MoveParameters } from "glados/group/move/base";
import { HardwareChallengeBase } from "glados/group/move/hardwarechallenges/base";
import * as Scenarios from "glados/group/move/hardwarechallenges/scenarios";
import * as BallObserver from "glados/observer/ball";
import { DribbleToPos } from "glados/task/shared/dribbletopos";
import { Halt } from "glados/task/shared/halt";

export class DribbleChallenge extends HardwareChallengeBase {
	protected _challengeNumber: 1 | 2 | 3 | 4 | undefined = 3;

	private static _gates: [Position, Vector][] = [];
	private static _currentGateIndex: number = 0;
	private static _moveToMidwayPos: boolean = true;
	private static _currentTargetPosition: Position = new Vector(0, 0);
	private _customObstacles: Obstacle[];
	private static _lastGate: number = -1;
	private _left: boolean = false;
	private static _previouslyLeft: boolean = false;

	public constructor(robots: FriendlyRobot[], messaging: MessageBox) {
		super(robots, messaging, Scenarios.challenge3);

		for (let i = this._opponentTransforms.length - 1; i > 0; --i) {
			const posA = this._opponentTransforms[i].pos;
			const posB = this._opponentTransforms[i - 1].pos;
			const relativePosition = posB - posA;
			DribbleChallenge._gates[this._opponentTransforms.length - i - 1] = [posA, relativePosition];
		}

		this._customObstacles = this._opponentTransforms.map((transform) => {
			let name: string = `dribbleObstacleY${transform.pos.x}`;
			return {
				type: "circle",
				center: transform.pos,
				radius: this._robots[0].radius * 1.1,
				name: name
			};
		});

		DribbleChallenge._currentTargetPosition = DribbleChallenge._moveToMidwayPos ? this.getMidwayPosition() : this.getCurrentGatePosition();
	}

	private getCurrentGatePosition(): Position {
		const currentGate = DribbleChallenge._gates[DribbleChallenge._currentGateIndex];
		return currentGate[0] + 0.5 * currentGate[1];
	}

	private getNextGateIndex(): number {
		// if currentGate is the last gate return currentGate as the nextGate
		return Math.min(DribbleChallenge._gates.length - 1, DribbleChallenge._currentGateIndex + 1);
	}

	private getNextGatePosition(): Position {
		const nextGate = DribbleChallenge._gates[this.getNextGateIndex()];
		return nextGate[0] + 0.5 * nextGate[1];
	}

	private getMidwayPosition(): Position {
		if (DribbleChallenge._currentGateIndex === DribbleChallenge._gates.length - 1) {
			const yOffset = 0.1 + this._robots[0].radius * 2;
			if (this._left) {
				return this.getCurrentGatePosition() + new Vector(0, -yOffset);
			} else {
				return this.getCurrentGatePosition() + new Vector(0, yOffset);
			}
		}

		const currentGate = DribbleChallenge._gates[DribbleChallenge._currentGateIndex];
		const yOffset = 0.5;
		if (this._left) {
			return currentGate[0] + new Vector(0, -yOffset);
		} else {
			return currentGate[0] + new Vector(0, yOffset);
		}
	}

	private getNextMidwayPosition(): Position {
		if (DribbleChallenge._currentGateIndex === DribbleChallenge._gates.length - 1) {
			const yOffset = 0.1 + this._robots[0].radius * 2;
			if (this._left) {
				return this.getCurrentGatePosition() + new Vector(0, -yOffset);
			} else {
				return this.getCurrentGatePosition() + new Vector(0, yOffset);
			}
		} else {
			const currentGate = DribbleChallenge._gates[this.getNextGateIndex()];
			const yOffset = 0.5;
			if (this._left) {
				return currentGate[0] + new Vector(0, -yOffset);
			} else {
				return currentGate[0] + new Vector(0, yOffset);
			}
		}
	}

	private getBallPosition(): Position {
		if (World.Ball.isPositionValid() && World.Ball.detectionQuality > 0.5) {
			return BallObserver.getRealisticBallPos();
		} else {
			return this._robots[0].pos + Vector.fromAngle(this._robots[0].dir) * (this._robots[0].radius - World.Ball.radius);
		}
	}

	private checkIfGatePassed(): boolean {
		const gatePosition = this.getCurrentGatePosition();
		let ballPosition: Position = this.getBallPosition();
		const currentGate = DribbleChallenge._gates[DribbleChallenge._currentGateIndex];
		const betweenObstacles = ballPosition.x > currentGate[0].x + this._robots[0].radius && ballPosition.x < (currentGate[0] + currentGate[1]).x + this._robots[0].radius;
		const crossingThreshold = World.Ball.radius + 0.05;
		let crossed = false;
		if (this._left) {
			crossed = ballPosition.y - gatePosition.y < -crossingThreshold;
		} else {
			crossed = ballPosition.y - gatePosition.y > crossingThreshold;
		}
		return (this._left !== DribbleChallenge._previouslyLeft) && betweenObstacles && crossed;
	}

	// returns true if position changed
	private updateTargetPosition(): boolean {
		if (DribbleChallenge._currentGateIndex === DribbleChallenge._gates.length - 1) {
			if ((DribbleChallenge._currentTargetPosition - this._robots[0].pos).length() < 0.1) {
				DribbleChallenge._moveToMidwayPos = true;
				DribbleChallenge._currentTargetPosition = this.getNextMidwayPosition();

				return true;
			} else {
				return false;
			}
		}

		if (DribbleChallenge._moveToMidwayPos) {
			if ((this._robots[0].pos - DribbleChallenge._currentTargetPosition).length() < this._robots[0].radius * 2) {
				DribbleChallenge._moveToMidwayPos = false;
				DribbleChallenge._currentTargetPosition = this.getCurrentGatePosition();

				return true;
			}
		} else {
			if ((DribbleChallenge._currentTargetPosition - this._robots[0].pos).length() < 0.1) {
				DribbleChallenge._moveToMidwayPos = true;
				DribbleChallenge._currentTargetPosition = this.getNextMidwayPosition();

				return true;
			}
		}
		return false;
	}

	public challengeSpecificUpdateTask(): MoveParameters {
		let taskAssignments = new Map<FriendlyRobot, Assignment>();

		let restart = false;

		if (this.checkIfGatePassed()) {
			DribbleChallenge._previouslyLeft = this._left;
			DribbleChallenge._currentGateIndex = this.getNextGateIndex();
			if (DribbleChallenge._currentGateIndex === DribbleChallenge._gates.length - 1) {
				DribbleChallenge._lastGate += 1;
				amun.log("last gate", DribbleChallenge._lastGate);
			}
			restart = true;
			amun.log("current gate", DribbleChallenge._currentGateIndex);
		}

		if (DribbleChallenge._lastGate >= 3) {
			taskAssignments[this._robots[0]] = Assignment.create({
				class: Halt,
				params: [],
				restart: false
			});
			return { assignments: taskAssignments };
		}

		if (this._left && this.getBallPosition().y - this.getCurrentGatePosition().y < -0.1) {
			this._left = false;
			DribbleChallenge._previouslyLeft = true;
		} else if (!this._left && this.getBallPosition().y - this.getCurrentGatePosition().y > 0.1) {
			this._left = true;
			DribbleChallenge._previouslyLeft = false;
		}

		restart = restart || this.updateTargetPosition();

		taskAssignments[this._robots[0]] = Assignment.create({
			class: DribbleToPos,
			params: [{ pos: DribbleChallenge._currentTargetPosition, customObstacles: this._customObstacles, useCMA: true, ignoreDefaultObstacles: true }],
			restart: restart
		});

		return { assignments: taskAssignments };
	}
}
