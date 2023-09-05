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
	constructor() {
		super();
		this.addTest("correct pre and post", this.testCorrectPreAndPost);
		this.addTest("finished process", this.testFinishedProcess);
	}

	private testCorrectPreAndPost() {
		let preInstance = new SpyProcess();
		let postInstance = new SpyProcess();
		Processor.addPre(preInstance);
		this.assert_eq(preInstance.counter, 0);
		Processor.pre();
		this.assert_eq(preInstance.counter, 1);
		this.assert_eq(postInstance.counter, 0);
		Processor.post();
		this.assert_eq(preInstance.counter, 1);
		this.assert_eq(postInstance.counter, 0);
		Processor.addPost(postInstance);
		this.assert_eq(preInstance.counter, 1);
		this.assert_eq(postInstance.counter, 0);
		Processor.pre();
		this.assert_eq(preInstance.counter, 2);
		this.assert_eq(postInstance.counter, 0);
		Processor.post();
		this.assert_eq(preInstance.counter, 2);
		this.assert_eq(postInstance.counter, 1);
	}

	private testFinishedProcess() {
		let instance = new SpyProcess();
		Processor.addPre(instance);
		this.assert_eq(instance.counter, 0);
		Processor.pre();
		this.assert_eq(instance.counter, 1);
		instance.finished = true;
		Processor.pre();
		this.assert_eq(instance.counter, 2);
		// check that process is removed
		Processor.pre();
		this.assert_eq(instance.counter, 2);

		// an already finished process is run exactly once
		Processor.addPre(instance);
		Processor.pre();
		this.assert_eq(instance.counter, 3);
		Processor.pre();
		this.assert_eq(instance.counter, 3);
	}
}
export let testClass = BaseProcessor;
