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

import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseField extends UnitTest {
	/* eslint-disable @typescript-eslint/naming-convention */
	private static World = {
		Geometry: {
			FieldHeightHalf: 4.5,
			FieldWidthHalf: 3,
			FreeKickDefenseDist: 0.2,
			DefenseStretch: 0.5,
			DefenseRadius: 1,
			GoalWidth: 1,
			GoalDepth: 0.18
		},
		RULEVERSION: "" // keep empty for now
	};
	private Field: any;
	private G: any;
	private static Referee = {
		isStopState: function() {
			return false;
		},
		isFriendlyFreeKickState: function() {
			return false;
		}
	};
	/* eslint-enable @typescript-eslint/naming-convention */

	public constructor() {
		super();
		this._addTest("distanceToDefenseArea_2018", this._testDistanceToDefenseArea_2018);
		this._addTest("distanceToDefenseArea_2017", this._testDistanceToDefenseArea_2017);
		this._addTest("intersectDefenseArea_2018", this._testIntersectDefenseArea_2018);

		this.G = BaseField.World.Geometry;
		this.G.DefenseStretchHalf = this.G.DefenseStretch / 2;
		this.G.DefenseHeight = this.G.DefenseRadius;
		this.G.DefenseWidth = this.G.DefenseHeight * 2;
		this.G.DefenseWidthHalf = this.G.DefenseWidth / 2;
	}

	public static getOverlays() {
		return { "base/world": this.World, "base/referee": this.Referee };
	}

	private _initHelper(ruleversion: string) {
		BaseField.World.RULEVERSION = ruleversion;
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		this.Field = require("base/field", true, BaseField.getOverlays());
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _testDistanceToDefenseArea_2018() {
		this._initHelper("2018");

		let pos = new Vector(0, 0);
		this._assert_eq(this.Field.distanceToDefenseArea(pos, 3, false), 0.5);
		this._assert_eq(this.Field.distanceToDefenseArea(pos, 3, true), 0.5);

		this._assert_false(this.Field.isInDefenseArea(pos, 0.18, false));
		this._assert_false(this.Field.isInDefenseArea(pos, 0.18, true));
		pos = new Vector(0.1, this.G.FieldHeightHalf);
		this._assert_true(this.Field.isInDefenseArea(pos, 0.18, false));
		this._assert_false(this.Field.isInDefenseArea(pos, 0.18, true));
		pos = new Vector(this.G.DefenseWidthHalf + 0.2, -this.G.FieldHeightHalf + 0.4);
		this._assert_true(this.Field.isInDefenseArea(pos, 0.3, true));
		this._assert_false(this.Field.isInDefenseArea(pos, 0.3, false));
		pos = new Vector(this.G.DefenseWidthHalf + 0.1, this.G.FieldHeightHalf - this.G.DefenseHeight - 0.1);
		this._assert_true(this.Field.isInDefenseArea(pos, 0.2, false));

		pos = new Vector(this.G.DefenseWidthHalf - 0.01, this.G.FieldHeightHalf - this.G.DefenseHeight / 2);
		this._assert_true(Math.abs(this.Field.distanceToDefenseArea(pos, -0.02, false) - 0.01) < 0.000001);
		this._assert_false(this.Field.isInDefenseArea(pos, -0.02, false));
		this._assert_true(this.Field.distanceToDefenseArea(pos, -0.005, false) <= 0);
		this._assert_true(this.Field.isInDefenseArea(pos, -0.005, false));
		pos = new Vector(0, this.G.FieldHeightHalf - this.G.DefenseHeight / 2);
		this._assert_true(this.Field.distanceToDefenseArea(pos, -this.G.DefenseHeight / 2 + 0.0001, false) <= 0);
		this._assert_true(this.Field.isInDefenseArea(pos, -this.G.DefenseHeight / 2 + 0.0001, false));
		this._assert_true(this.Field.distanceToDefenseArea(pos, -this.G.DefenseHeight / 2 - 0.0001, false) > 0);
		this._assert_false(this.Field.isInDefenseArea(pos, -this.G.DefenseHeight / 2 - 0.0001, false));
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _testDistanceToDefenseArea_2017() {
		this._initHelper("2017");

		let pos = new Vector(0, 0);
		this._assert_eq(this.Field.distanceToDefenseArea(pos, 3, false), 0.5);
		this._assert_eq(this.Field.distanceToDefenseArea(pos, 3, true), 0.5);
		this._assert_false(this.Field.isInDefenseArea(pos, 0.18, false));
		this._assert_false(this.Field.isInDefenseArea(pos, 0.18, true));
		pos = new Vector(0.1, this.G.FieldHeightHalf);
		this._assert_true(this.Field.isInDefenseArea(pos, 0.18, false));
		this._assert_false(this.Field.isInDefenseArea(pos, 0.18, true));


		pos = new Vector(this.G.DefenseStretchHalf + this.G.DefenseRadius - 0.01, this.G.FieldHeightHalf);
		this._assert_true(Math.abs(this.Field.distanceToDefenseArea(pos, -0.02) - 0.01) < 0.000001);
		this._assert_false(this.Field.isInDefenseArea(pos, -0.02));
		this._assert_true(this.Field.distanceToDefenseArea(pos, -0.005) <= 0);
		this._assert_true(this.Field.isInDefenseArea(pos, -0.005));
		pos = new Vector(0, this.G.FieldHeightHalf);
		this._assert_true(this.Field.distanceToDefenseArea(pos, -this.G.DefenseRadius + 0.0001) <= 0);
		this._assert_true(this.Field.isInDefenseArea(pos, -this.G.DefenseRadius + 0.0001));
		this._assert_true(this.Field.distanceToDefenseArea(pos, -this.G.DefenseRadius - 0.0001) > 0);
		this._assert_false(this.Field.isInDefenseArea(pos, -this.G.DefenseRadius - 0.0001));
	}

	// eslint-disable-next-line @typescript-eslint/naming-convention
	private _testIntersectDefenseArea_2018() {
		this._initHelper("2018");

		let pos = new Vector(0, 0);
		let dir = new Vector(0, -1);
		let d = 0.2;
		let v = new Vector(0, -this.G.FieldHeightHalf + this.G.DefenseHeight + d);
		let intersection = this.Field.intersectRayDefenseArea(pos, dir, d, true)[0];
		this._assert_true(v.distanceToSq(intersection) === 0);
	}
}
export let testClass = BaseField;
