import * as C from "base/coordinates";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseCoordinates extends UnitTest {
	public constructor() {
		super();
		C._setIsBlue(true);
		for (let [teamName, teamIsBlue] of [["yellow team - ", false], ["blue team - ", true]]) {
			this._addTest(`${teamName}vector`, this._wrapTeamColor(teamIsBlue as boolean, this._testVector));
			this._addTest(`${teamName}direction`, this._wrapTeamColor(teamIsBlue as boolean, this._testDirection));
			this._addTest(`${teamName}list`, this._wrapTeamColor(teamIsBlue as boolean, this._testList));
		}
	}

	private _wrapTeamColor(teamIsBlue: boolean, method: Function) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const classThis = this;
		return function() {
			C._setIsBlue(teamIsBlue);
			method.call(classThis, teamIsBlue);
		};
	}

	private _testVector(teamIsBlue: boolean) {
		{
			let vec = new Vector(1, 2);
			let vec2 = C.Coordinates.toGlobal(vec);
			let vec3 = C.Coordinates.toLocal(vec);
			if (teamIsBlue) {
				this._assert_eq(vec2.x, -vec.x);
				this._assert_eq(vec2.y, -vec.y);
				this._assert_eq(vec3.x, -vec.x);
				this._assert_eq(vec3.y, -vec.y);
			} else {
				this._assert_eq(vec2.x, vec.x);
				this._assert_eq(vec2.y, vec.y);
				this._assert_eq(vec3.x, vec.x);
				this._assert_eq(vec3.y, vec.y);
			}
		}
		{
			let vec = new Vector(1, 2);
			let vec2 = C.Coordinates.toGlobal(vec);
			let vec3 = C.Coordinates.toLocal(vec);
			if (teamIsBlue) {
				this._assert_eq(vec2.x, -vec.x);
				this._assert_eq(vec2.y, -vec.y);
				this._assert_eq(vec3.x, -vec.x);
				this._assert_eq(vec3.y, -vec.y);
			} else {
				this._assert_eq(vec2.x, vec.x);
				this._assert_eq(vec2.y, vec.y);
				this._assert_eq(vec3.x, vec.x);
				this._assert_eq(vec3.y, vec.y);
			}
		}
	}

	private _testDirection(teamIsBlue: boolean) {
		{
			let dir = Math.PI / 4;
			let dir2 = C.Coordinates.toGlobal(dir);
			let dir3 = C.Coordinates.toLocal(dir);
			if (teamIsBlue) {
				this._assert_eq(dir2, dir + Math.PI);
				this._assert_eq(dir3, dir + Math.PI);
			} else {
				this._assert_eq(dir2, dir);
				this._assert_eq(dir3, dir);
			}
		}
		{
			let dir = Math.PI * 5 / 4;
			let dir2 = C.Coordinates.toGlobal(dir);
			let dir3 = C.Coordinates.toLocal(dir);
			if (teamIsBlue) {
				this._assert_eq(dir2, dir - Math.PI);
				this._assert_eq(dir3, dir - Math.PI);
			} else {
				this._assert_eq(dir2, dir);
				this._assert_eq(dir3, dir);
			}
		}
	}

	private _testList(teamIsBlue: boolean) {
		let list: [Vector, Vector, number] = [new Vector(0, 1), new Vector(1, 2), Math.PI / 4];
		let list2 = C.Coordinates.listToGlobal(list as any);

		if (teamIsBlue) {
			this._assert_deep_eq([-list[0], -list[1], Math.PI * 5 / 4], list2);
		} else {
			this._assert_deep_eq(list, list2);
		}
	}
}
export let testClass = BaseCoordinates;
