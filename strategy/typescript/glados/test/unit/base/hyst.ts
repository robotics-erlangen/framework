import { Hyst, LessThanHyst, GreaterThanHyst } from "base/hyst";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseHyst extends UnitTest {
	constructor() {
		super();
		this.addTest("LessThanHyst", this.testLessThanHyst);
		this.addTest("GreaterThanHyst", this.testGreaterThanHyst);
	}

	private testHystSequence<In, Out>(hyst: Hyst<In, Out>, io: [In, Out][], assert_fn: (got: Out, expected: Out, input: In) => void) {
		for (const [i, o] of io) {
			assert_fn(hyst.update(i), o, i);
		}
	}

	private testLessThanHyst() {
		const IN_OUT: [number, boolean][] = [
			[-2, true],
			[-1, true],
			[0, true],
			[1, false],
			[2, false],
			[1, false],
			[1, false],
			[0, false],
			[0, false],
			[1, false],
			[-1, true],
			[-2, true],
		];
		const THRESHOLD: number = 0;
		const HYST: number = 0.5;

		for (const initialState of [false, true]) {
			const hyst = new LessThanHyst(THRESHOLD, HYST, initialState);
			this.assert_eq(hyst.state, initialState);
			this.testHystSequence(
				hyst,
				IN_OUT,
				(got, expected, input) => this.assert_eq(got, expected, () => `${hyst}.update(${input}) returned ${got} instead of ${expected}`)
			);
		}
	}

	private testGreaterThanHyst() {
		const IN_OUT: [number, boolean][] = [
			[-2, false],
			[-1, false],
			[0, false],
			[1, true],
			[2, true],
			[1, true],
			[1, true],
			[0, true],
			[0, true],
			[1, true],
			[-1, false],
			[-2, false],
		];
		const THRESHOLD: number = 0;
		const HYST: number = 0.5;

		for (const initialState of [false, true]) {
			const hyst = new GreaterThanHyst(THRESHOLD, HYST, initialState);
			this.assert_eq(hyst.state, initialState);
			this.testHystSequence(
				hyst,
				IN_OUT,
				(got, expected, input) => this.assert_eq(got, expected, () => `${hyst}.update(${input}) returned ${got} instead of ${expected}`)
			);
		}
	}
}
export let testClass = BaseHyst;
