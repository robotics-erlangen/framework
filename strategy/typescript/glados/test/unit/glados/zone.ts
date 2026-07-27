/**************************************************************************
*   Copyright 2026 Robotics Erlangen e.V.                                 *
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
import { isInZone } from "glados/util/zone";

export class Zone extends UnitTest {
	public constructor() {
		super();
		this._addTest("_testInZone", this._testInZone);
		this._addTest("_testInZoneBoundary", this._testInZoneBoundary);
	}

	private _testInZone() {
		const zone = {
			boundaries: {
				left: -2,
				right: 2,
				bottom: -1,
				top: 1
			},
			defaultPos: new Vector(0, 0)
		};
		const pos = new Vector(0, 0);
		this._assert_true(isInZone(pos, zone));

		// edges are in the zone
		const borderPos = new Vector(-2, -1);
		this._assert_true(isInZone(borderPos, zone));

		const outPos = new Vector(-2.05, -1);
		this._assert_false(isInZone(outPos, zone));
	}

	private _testInZoneBoundary() {
		const zone = {
			boundaries: {
				left: -2,
				right: 2,
				bottom: -1,
				top: 1
			},
			defaultPos: new Vector(0, 0)
		};
		const pos = new Vector(-2.05, 0);
		this._assert_false(isInZone(pos, zone));
		this._assert_true(isInZone(pos, zone, 0.05));
	}
}

export const testClass = Zone;
