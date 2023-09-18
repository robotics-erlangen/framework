import { Hyst, LessThanHyst, GreaterThanHyst, InIntervalHyst, MultiValueHyst } from "base/hyst";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseHyst extends UnitTest {
	constructor() {
		super();
		this.addTest("LessThanHyst", this.testLessThanHyst);
		this.addTest("GreaterThanHyst", this.testGreaterThanHyst);
		this.addTest("InIntervalHyst", this.testInIntervalHyst);
		this.addTest("MultiValueHyst", this.testMultiValueHyst);
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
			{
				const hyst = new LessThanHyst(THRESHOLD, HYST, initialState);
				this.assert_eq(hyst.state, initialState);
				this.testHystSequence(
					hyst,
					IN_OUT,
					(got, expected, input) => this.assert_eq(got, expected, () => `${hyst}.update(${input}) returned ${got} instead of ${expected}`)
				);
			}
			{
				const hyst = LessThanHyst.fromBounds(THRESHOLD - HYST, THRESHOLD + HYST, initialState);
				this.assert_eq(hyst.state, initialState);
				this.testHystSequence(
					hyst,
					IN_OUT,
					(got, expected, input) => this.assert_eq(got, expected, () => `${hyst}.update(${input}) returned ${got} instead of ${expected}`)
				);
			}
		}

		this.assert_error(() => new LessThanHyst(10, -0.4)); // negative hyst value
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
			{
				const hyst = new GreaterThanHyst(THRESHOLD, HYST, initialState);
				this.assert_eq(hyst.state, initialState);
				this.testHystSequence(
					hyst,
					IN_OUT,
					(got, expected, input) => this.assert_eq(got, expected, () => `${hyst}.update(${input}) returned ${got} instead of ${expected}`)
				);
			}
			{
				const hyst = GreaterThanHyst.fromBounds(THRESHOLD - HYST, THRESHOLD + HYST, initialState);
				this.assert_eq(hyst.state, initialState);
				this.testHystSequence(
					hyst,
					IN_OUT,
					(got, expected, input) => this.assert_eq(got, expected, () => `${hyst}.update(${input}) returned ${got} instead of ${expected}`)
				);
			}
		}

		this.assert_error(() => new GreaterThanHyst(10, -0.4)); // negative hyst value
	}

	private testInIntervalHyst() {
		const IN_OUT: [number, boolean][] = [
			[-7, false],
			[-6, false],
			[-5, false],
			[-4, true],
			[-3, true],
			[-2, true],
			[-1, true],
			[-2, true],
			[-3, true],
			[-1, true],
			[0, true],
			[2, true],
			[4, true],
			[5, true],
			[6, false],
			[5, false],
			[4, true],
			[-10, false],
		];
		const THRESHOLDS: [number, number] = [-5, 5];
		const HYST: number = 0.5;

		for (const initialState of [false, true]) {
			const hyst = new InIntervalHyst(THRESHOLDS, HYST, initialState);
			this.assert_eq(hyst.state, initialState);
			this.testHystSequence(
				hyst,
				IN_OUT,
				(got, expected, input) => this.assert_eq(got, expected, () => `${hyst}.update(${input}) returned ${got} instead of ${expected}`)
			);
		}

		this.assert_error(() => new InIntervalHyst([1, 10], -0.4)); // negative hyst value
		this.assert_error(() => new InIntervalHyst([10, 1], 0.4)); // empty interval
	}

	private testMultiValueHyst() {
		const VALUES: string[] = ["a", "b", "c", "d", "e", "f"];
		const IN_OUT: [number, string][] = [
			[0, "a"],
			[5, "a"],
			[10, "a"],
			[11, "a"],
			[13, "b"],
			[10, "b"],
			[9, "b"],
			[15, "b"],
			[24, "c"],
			[27, "c"],
			[30, "c"],
			[35, "d"],
			[30, "d"],
			[25, "c"],
			[30, "c"],
			[33, "d"],
			[40, "d"],
			[41, "d"],
			[44, "e"],
			[100, "f"],
		];
		const THRESHOLDS: number[] = [10, 20, 30, 40, 50];
		const HYST: number = 2;

		for (const initialState of VALUES) {
			const hyst = new MultiValueHyst(VALUES, THRESHOLDS, HYST, initialState);
			this.assert_eq(hyst.state, initialState);
			this.testHystSequence(
				hyst,
				IN_OUT,
				(got, expected, input) => this.assert_eq(got, expected, () => `${hyst}.update(${input}) returned ${got} instead of ${expected}`)
			);
		}

		this.assert_error(() => new MultiValueHyst(["a"], [], 0.4)); // too few values
		this.assert_error(() => new MultiValueHyst(["a", "b"], [], 0.4)); // too few thresholds
		this.assert_error(() => new MultiValueHyst(["a", "b"], [1, 2], 0.4)); // too many thresholds
		this.assert_error(() => new MultiValueHyst(["a", "b"], [1], -0.4)); // negative hyst value
		this.assert_error(() => new MultiValueHyst(["a", "b"], [1], 0.4, "x")); // invalid initialState
	}
}
export let testClass = BaseHyst;
