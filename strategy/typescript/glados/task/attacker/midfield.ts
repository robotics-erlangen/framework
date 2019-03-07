import { Position, Vector } from "base/vector";

import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import { MidfieldSampling } from "glados/task/ability/midfieldsampling";
import { SuggestPass } from "glados/task/ability/suggestpass";
import { Agent, Task } from "glados/task/base";
import * as PathHelper from "glados/trajectory/pathhelper";
import { ToTarget } from "glados/trajectory/totarget";


export class Midfield extends Task {
	private _passPos: Position | undefined = undefined; // ewwwww hack
	private _frameCount: number = 0;
	private _obstacleTable: PathHelper.PathHelperParameters;

	private _suggestPass: SuggestPass;
	private _midfieldSampling: MidfieldSampling;

	constructor(agent: Agent) {
		super(agent);

		let ignore = false;
		this._obstacleTable = {
			ignoreBall: ignore,
			ignoreGoals: ignore,
			ignoreDefenseArea: ignore,
			ignoreOpponentDefenseArea: ignore,
			messaging: this._messaging,
			ignorePass: ignore,
			ignoreBallPlacementObstacle: false
		};

		this._suggestPass = new SuggestPass(this._robot, this._messaging);
		this._midfieldSampling = new MidfieldSampling(this._robot, this._messaging);
	}

	private _samplePassPosition(): Position {
		let zone = this._messaging.receiveTrainer(MessageType.midfieldZone);
		if (zone == undefined) {
			throw new Error("midfield task running without zone assignment");
		}

		let left = zone.boundaries.left;
		let right = zone.boundaries.right;
		let top = zone.boundaries.top;
		let bottom = zone.boundaries.bottom;

		let width = right - left;
		let height = top - bottom;

		let xStep = width / 3;
		let yStep = height / 6;

		let bestScore = -Infinity;
		let bestPoint = undefined;
		for (let x = left; width < 0 ? x >= left + width : x <= left + width;x += xStep) {
			for (let y = bottom; height < 0 ? y >= bottom + height : y <= bottom + height; y += yStep) {
				let candidatePoint = new Vector(x, y);
				let rating = this._midfieldSampling.evalLocation(candidatePoint, bestScore);
				if (rating > bestScore) {
					bestScore = rating;
					bestPoint = candidatePoint;
				}
			}
		}

		return bestPoint!;
	}

	// local disco = [
	// 	vis.colors.red,
	// 	vis.colors.blue,
	// 	vis.colors.green,
	// 	vis.colors.pink,
	// 	vis.colors.turquoise,
	// 	vis.colors.yellow,
	// 	vis.colors.skyBlue,
	// 	vis.colors.mediumPurple
	// ]

	run() {
		PathHelper.setDefaultObstaclesByTable(this._robot.path, this._robot, this._obstacleTable);

		this._midfieldSampling.precalculate();

		// Hacky quickfix for messaging delay problems
		if ((this._frameCount % 2) === 0) {
			this._passPos = this._samplePassPosition();
		}
		this._frameCount = this._frameCount + 1;

		// local random = Math.round(Math.random() * #disco)
		// vis.addCircle("middy", this._robot.pos, 0.1, disco[random] or vis.colors.orange, true)

		let zone = this._messaging.receiveTrainer(MessageType.midfieldZone);
		let defaultPos = zone!.defaultPos;

		let attackPosition = this._messaging.receiveSingleSender(MessageType.attackPosition)[1];

		let time = Physics.robotTimeToPos(this._robot, this._passPos!, new Vector(0, 0))[0];
		if (this._passPos) {
			this._suggestPass._suggestPass(this._passPos, attackPosition, time);
		}

		this._robot.trajectory.update(ToTarget, defaultPos, Math.PI / 2, undefined, new Vector(0, 0));
	}
}
