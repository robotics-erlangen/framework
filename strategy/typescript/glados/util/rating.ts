/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, or     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

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

const levels: Map<MessageType, number> = new Map([
	[MessageType.mainAttacker, 3],
	[MessageType.duelAssistant, 1],
	[MessageType.interceptPass, 1],
	[MessageType.exchangeRobot, 1],
]);

export class LeveledRating {

	private _ratingArray: (number | undefined)[];
	private _maxFilled: number = -1;

	public constructor(type: MessageType);
	public constructor(type: undefined, customNumLevels: number);
	public constructor(type: MessageType | undefined, customNumLevels: number | undefined = undefined) {
		let length = 0;

		if (type !== undefined && levels.has(type)) {
			length = levels[type]!;
		} else if (customNumLevels !== undefined) {
			length = customNumLevels;
		} else {
			// todo
			this._ratingArray = new Array(0);
			throw new Error(`MessageType not implemented: ${type}`);
		}
		this._ratingArray = new Array(length);
		this.clear();
	}

	public get ratingArray(): (number | undefined)[] {
		return this._ratingArray;
	}

	public get maxFilled(): number {
		return this._maxFilled;
	}

	public setRating(level: number, v: number) {
		this._ratingArray[level] = v;
		if (level > this._maxFilled) {
			this._maxFilled = level;
		}
	}
	public clear() {
		this._ratingArray.fill(undefined);
		this._maxFilled = -1;
	}

	public static clone(rating: ReadonlyRec<LeveledRating>): LeveledRating {
		let result = new LeveledRating(undefined, rating.ratingArray.length);
		result._maxFilled = rating.maxFilled;
		for (let i = 0; i < rating.ratingArray.length; i++) {
			result._ratingArray[i] = rating.ratingArray[i];
		}
		return result;
	}

	public static findBestRating<T>(ratings: Map<T, LeveledRating>): T | undefined {
		const first = head(ratings);
		if (!first) {
			return undefined;
		}

		let best: [[T, LeveledRating], number | undefined ] = [first, first[1]._ratingArray[0]];
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
