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

import { Process } from "base/process";
import * as Processor from "base/processor";

import { UnitTest } from "glados/test/unit/unittest";

class SpyProcess implements Process {
	public counter: number = 0;
	public finished: boolean = false;

	public run() {
		this.counter += 1;
	}
	public isFinished() {
		return this.finished;
	}
}

export class BaseProcessor extends UnitTest {
	public constructor() {
		super();
		this._addTest("correct pre and post", this._testCorrectPreAndPost);
		this._addTest("finished process", this._testFinishedProcess);
	}

	private _testCorrectPreAndPost() {
		let preInstance = new SpyProcess();
		let postInstance = new SpyProcess();
		Processor.addPre(preInstance);
		this._assert_eq(preInstance.counter, 0);
		Processor.pre();
		this._assert_eq(preInstance.counter, 1);
		this._assert_eq(postInstance.counter, 0);
		Processor.post();
		this._assert_eq(preInstance.counter, 1);
		this._assert_eq(postInstance.counter, 0);
		Processor.addPost(postInstance);
		this._assert_eq(preInstance.counter, 1);
		this._assert_eq(postInstance.counter, 0);
		Processor.pre();
		this._assert_eq(preInstance.counter, 2);
		this._assert_eq(postInstance.counter, 0);
		Processor.post();
		this._assert_eq(preInstance.counter, 2);
		this._assert_eq(postInstance.counter, 1);
	}

	private _testFinishedProcess() {
		let instance = new SpyProcess();
		Processor.addPre(instance);
		this._assert_eq(instance.counter, 0);
		Processor.pre();
		this._assert_eq(instance.counter, 1);
		instance.finished = true;
		Processor.pre();
		this._assert_eq(instance.counter, 2);
		// check that process is removed
		Processor.pre();
		this._assert_eq(instance.counter, 2);

		// an already finished process is run exactly once
		Processor.addPre(instance);
		Processor.pre();
		this._assert_eq(instance.counter, 3);
		Processor.pre();
		this._assert_eq(instance.counter, 3);
	}
}
export let testClass = BaseProcessor;
