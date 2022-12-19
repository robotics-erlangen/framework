import * as C from "base/coordinates";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseCoordinates extends UnitTest {
	constructor() {
		super();
		C._setIsBlue(true);
		for (let [teamName, teamIsBlue] of [["yellow team - ", false], ["blue team - ", true]]) {
			this.addTest(`${teamName}vector`, this.wrapTeamColor(teamIsBlue as boolean, this.testVector));
			this.addTest(`${teamName}direction`, this.wrapTeamColor(teamIsBlue as boolean, this.testDirection));
			this.addTest(`${teamName}list`, this.wrapTeamColor(teamIsBlue as boolean, this.testList));
		}
	}

	private wrapTeamColor(teamIsBlue: boolean, method: Function) {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const classThis = this;
		return function() {
			C._setIsBlue(teamIsBlue);
			method.call(classThis, teamIsBlue);
		};
	}

	private testVector(teamIsBlue: boolean) {
		{
			let vec = new Vector(1, 2);
			let vec2 = C.Coordinates.toGlobal(vec);
			let vec3 = C.Coordinates.toLocal(vec);
			if (teamIsBlue) {
				this.assert_equal(vec2.x, -vec.x);
				this.assert_equal(vec2.y, -vec.y);
				this.assert_equal(vec3.x, -vec.x);
				this.assert_equal(vec3.y, -vec.y);
			} else {
				this.assert_equal(vec2.x, vec.x);
				this.assert_equal(vec2.y, vec.y);
				this.assert_equal(vec3.x, vec.x);
				this.assert_equal(vec3.y, vec.y);
			}
		}
		{
			let vec = new Vector(1, 2);
			let vec2 = C.Coordinates.toGlobal(vec);
			let vec3 = C.Coordinates.toLocal(vec);
			if (teamIsBlue) {
				this.assert_equal(vec2.x, -vec.x);
				this.assert_equal(vec2.y, -vec.y);
				this.assert_equal(vec3.x, -vec.x);
				this.assert_equal(vec3.y, -vec.y);
			} else {
				this.assert_equal(vec2.x, vec.x);
				this.assert_equal(vec2.y, vec.y);
				this.assert_equal(vec3.x, vec.x);
				this.assert_equal(vec3.y, vec.y);
			}
		}
	}

	private testDirection(teamIsBlue: boolean) {
		{
			let dir = Math.PI / 4;
			let dir2 = C.Coordinates.toGlobal(dir);
			let dir3 = C.Coordinates.toLocal(dir);
			if (teamIsBlue) {
				this.assert_equal(dir2, dir + Math.PI);
				this.assert_equal(dir3, dir + Math.PI);
			} else {
				this.assert_equal(dir2, dir);
				this.assert_equal(dir3, dir);
			}
		}
		{
			let dir = Math.PI * 5 / 4;
			let dir2 = C.Coordinates.toGlobal(dir);
			let dir3 = C.Coordinates.toLocal(dir);
			if (teamIsBlue) {
				this.assert_equal(dir2, dir - Math.PI);
				this.assert_equal(dir3, dir - Math.PI);
			} else {
				this.assert_equal(dir2, dir);
				this.assert_equal(dir3, dir);
			}
		}
	}

	private testList(teamIsBlue: boolean) {
		let list: [Vector, Vector, number] = [new Vector(0, 1), new Vector(1, 2), Math.PI / 4];
		let list2 = C.Coordinates.listToGlobal(list as any);

		if (teamIsBlue) {
			this.assert_deep_equal([-list[0], -list[1], Math.PI * 5 / 4], list2);
		} else {
			this.assert_deep_equal(list, list2);
		}
	}
}
export let testClass = BaseCoordinates;
