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
