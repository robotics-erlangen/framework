import * as MathUtil from "base/mathutil";
import { Position, Vector } from "base/vector";

import { MessageType } from "glados/control/messaging";
import * as Physics from "glados/observer/physics";
import { head } from "glados/util/collections";

export function timeToRating(time: number): number {
	if (time < 0) {
		return 1;
	} else {
		return 1 / (time + 1) ** 2;
	}
}

export function posToRating(robot: Physics.RobotLike, targetPos: Position) {
	return timeToRating(Physics.robotTimeToPos(robot, targetPos, new Vector(0, 0))[0]);
}

export function valueToRating(value: number, zero: number, one: number): number {
	return MathUtil.bound(0, (value - zero) / (one - zero), 1);
}

const Levels : Map<MessageType, number> = new Map([
	[MessageType.mainAttacker, 3],
	[MessageType.duelAssistant, 1],
	[MessageType.interceptPass, 1]
]);

export class LeveledRating {

	_ratingArray: (number | undefined)[];
	_maxFilled: number = -1;

	constructor(type: MessageType) {
		if (Levels.has(type)) {
			this._ratingArray = new Array(Levels[type]!);
			this.clear();
		} else {
			// todo
			this._ratingArray = new Array(0);
			throw new Error("MessageType not implemented: " + type);
		}
	}

	public setRating(level: number, v : number) {
		this._ratingArray[level] = v;
		if (level > this._maxFilled) {
			this._maxFilled = level;
		}
	}
	public clear() {
		this._ratingArray.fill(undefined);
		this._maxFilled = -1;
	}

	public static findBestRating<T>(ratings: Map<T, LeveledRating>) : T | undefined {
		const first = head(ratings);
		if (!first) {
			return undefined;
		}

		let best : [[T, LeveledRating], number | undefined ] = [first,first[1]._ratingArray[0]];
		let levels = first[1]._ratingArray.length;
		for (let level = 0; level < levels; level++) {
			best[1] = best[0][1]._maxFilled < level ? best[1] : best[0][1]._ratingArray[level];
			for (const rating of ratings) {
				let curr = rating[1]._ratingArray[level];
				if (curr == undefined) continue;
				if (best[1] != undefined) {
					if (best[1] > curr) continue;
					if (best[1] >= curr && best[0][1]._maxFilled >= rating[1]._maxFilled) continue;
				}
				best[0] = rating;
				best[1] = curr;
			}
		}
		return best[0][0];
	}
}
