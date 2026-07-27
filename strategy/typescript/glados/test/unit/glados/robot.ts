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

import * as Robot from "glados/observer/robot";
import { UnitTest } from "glados/test/unit/unittest";

export class GladosObserverRobot extends UnitTest {
	public constructor() {
		super();

		this._addTest("getDribblerEdges", this._testGetDribblerEdges);
	}

	private _testGetDribblerEdges() {
		// "Robot" looking with angle 0 (i.e in Positive x direction)
		const [rightOne, leftOne] = Robot.getDribblerEdges({
			dir: 0,
			dribblerPos: new Vector(0, 0),
			dribblerWidth: 1
		});
		amun.log(`left one = ${leftOne}, rightOne = ${rightOne}`);
		this._assert_lt(rightOne.distanceTo(new Vector(0.0, -0.5)), 0.01);
		this._assert_lt(leftOne.distanceTo(new Vector(0.0, 0.5)), 0.01);

		// "Robot" looking with angle 90 (i.e in Positive y direction)
		const [rightTwo, leftTwo] = Robot.getDribblerEdges({
			dir: Math.PI / 2,
			dribblerPos: new Vector(0, 0),
			dribblerWidth: 1,
		});
		this._assert_lt(rightTwo.distanceTo(new Vector(0.5, 0)), 0.01);
		this._assert_lt(leftTwo.distanceTo(new Vector(-0.5, 0)), 0.01);
	}
}

export let testClass = GladosObserverRobot;
