import { RingBuffer } from "base/ringbuffer";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseRingBuffer extends UnitTest {
	constructor() {
		super();
		this.addTest("constructor", this.testConstructor);
		this.addTest("isEmptyFull", this.testIsEmptyFull);
		this.addTest("clear", this.testClear);
		this.addTest("removeOrUndefined", this.testRemoveOrUndefined);
		this.addTest("remove", this.testRemove);
		this.addTest("putOrReplace", this.testPutOrReplace);
		this.addTest("put", this.testPut);
		this.addTest("peek", this.testPeek);
		this.addTest("toArray", this.testToArray);
	}

	private testConstructor() {
		{
			const rb = new RingBuffer(12);
			this.assert_eq(rb.size(), 12);
			this.assert_eq(rb.length(), 0);
		}

		{
			const rb = new RingBuffer(10, [1, 2, 3]);
			this.assert_eq(rb.size(), 10);
			this.assert_eq(rb.length(), 3);
		}

		this.assert_error(() => new RingBuffer(0));
		this.assert_error(() => new RingBuffer(-1));
		this.assert_error(() => new RingBuffer(2, [1, 2, 3]));
	}

	private testIsEmptyFull() {
		{
			const rb = new RingBuffer(2);
			this.assert_true(rb.isEmpty());
			this.assert_false(rb.isFull());

			rb.put(12);

			this.assert_false(rb.isEmpty());
			this.assert_false(rb.isFull());

			rb.put(12);

			this.assert_false(rb.isEmpty());
			this.assert_true(rb.isFull());
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this.assert_false(rb.isEmpty());
			this.assert_false(rb.isFull());

			rb.put(12);

			this.assert_false(rb.isEmpty());
			this.assert_true(rb.isFull());

			this.assert_eq(rb.remove(), 1);

			this.assert_false(rb.isEmpty());
			this.assert_false(rb.isFull());
		}
	}

	private testClear() {
		const rb = new RingBuffer(4, [1, 2, 3]);
		this.assert_eq(rb.length(), 3);
		rb.clear();
		this.assert_eq(rb.length(), 0);
	}

	private testRemoveOrUndefined() {
		{
			const rb = new RingBuffer(2);
			this.assert_eq(rb.length(), 0);
			this.assert_undefined(rb.removeOrUndefined());
			this.assert_eq(rb.length(), 0);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this.assert_eq(rb.length(), 3);

			this.assert_eq(rb.removeOrUndefined(), 1);
			this.assert_eq(rb.length(), 2);

			this.assert_eq(rb.removeOrUndefined(), 2);
			this.assert_eq(rb.length(), 1);

			this.assert_eq(rb.removeOrUndefined(), 3);
			this.assert_eq(rb.length(), 0);

			this.assert_undefined(rb.removeOrUndefined());
			this.assert_eq(rb.length(), 0);
		}
	}

	private testRemove() {
		{
			const rb = new RingBuffer(3);
			this.assert_eq(rb.length(), 0);
			this.assert_error(() => rb.remove());
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this.assert_eq(rb.length(), 3);

			this.assert_eq(rb.remove(), 1);
			this.assert_eq(rb.length(), 2);

			this.assert_eq(rb.remove(), 2);
			this.assert_eq(rb.length(), 1);

			this.assert_eq(rb.remove(), 3);
			this.assert_eq(rb.length(), 0);

			this.assert_error(() => rb.remove());
			this.assert_eq(rb.length(), 0);
		}
	}

	private testPutOrReplace() {
		{
			const rb = new RingBuffer(3);

			rb.putOrReplace(1);
			this.assert_eq(rb.length(), 1);
			this.assert_deep_eq(rb.toArray(), [1]);

			rb.putOrReplace(2);
			this.assert_eq(rb.length(), 2);
			this.assert_deep_eq(rb.toArray(), [1, 2]);

			rb.putOrReplace(3);
			this.assert_eq(rb.length(), 3);
			this.assert_deep_eq(rb.toArray(), [1, 2, 3]);

			rb.putOrReplace(4);
			this.assert_eq(rb.length(), 3);
			this.assert_deep_eq(rb.toArray(), [2, 3, 4]);

			rb.putOrReplace(5);
			this.assert_eq(rb.length(), 3);
			this.assert_deep_eq(rb.toArray(), [3, 4, 5]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			rb.putOrReplace(4);
			this.assert_eq(rb.length(), 4);
			this.assert_deep_eq(rb.toArray(), [1, 2, 3, 4]);

			rb.putOrReplace(5);
			this.assert_eq(rb.length(), 4);
			this.assert_deep_eq(rb.toArray(), [2, 3, 4, 5]);
		}
	}

	private testPut() {
		{
			const rb = new RingBuffer(3);

			rb.put(1);
			this.assert_eq(rb.length(), 1);

			rb.put(2);
			this.assert_eq(rb.length(), 2);

			rb.put(3);
			this.assert_eq(rb.length(), 3);

			this.assert_error(() => rb.put(4));
			this.assert_eq(rb.length(), 3);

			this.assert_deep_eq(rb.toArray(), [1, 2, 3]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			rb.put(4);
			this.assert_eq(rb.length(), 4);

			this.assert_error(() => rb.put(5));
			this.assert_eq(rb.length(), 4);

			this.assert_deep_eq(rb.toArray(), [1, 2, 3, 4]);
		}
	}

	private testPeek() {
		{
			const rb = new RingBuffer(3);

			this.assert_undefined(rb.peek());

			rb.put(1);
			this.assert_eq(rb.length(), 1);
			this.assert_eq(rb.peek(), 1);

			rb.put(2);
			this.assert_eq(rb.length(), 2);
			this.assert_eq(rb.peek(), 1);

			rb.put(3);
			this.assert_eq(rb.length(), 3);
			this.assert_eq(rb.peek(), 1);

			this.assert_eq(rb.remove(), 1);
			this.assert_eq(rb.length(), 2);
			this.assert_eq(rb.peek(), 2);
			this.assert_eq(rb.peek(), 2);

			this.assert_deep_eq(rb.toArray(), [2, 3]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			this.assert_eq(rb.peek(), 1);
			rb.put(4);
			this.assert_eq(rb.peek(), 1);
			this.assert_eq(rb.remove(), 1);
			this.assert_eq(rb.peek(), 2);

			this.assert_deep_eq(rb.toArray(), [2, 3, 4]);
		}
	}

	private testToArray() {
		{
			const rb = new RingBuffer(3);
			this.assert_deep_eq(rb.toArray(), []);

			this.assert_eq(rb.putOrReplace(10), undefined);
			this.assert_deep_eq(rb.toArray(), [10]);

			this.assert_eq(rb.putOrReplace(20), undefined);
			this.assert_deep_eq(rb.toArray(), [10, 20]);

			this.assert_eq(rb.putOrReplace(30), undefined);
			this.assert_deep_eq(rb.toArray(), [10, 20, 30]);

			this.assert_eq(rb.putOrReplace(40), 10);
			this.assert_deep_eq(rb.toArray(), [20, 30, 40]);

			this.assert_eq(rb.removeOrUndefined(), 20);
			this.assert_deep_eq(rb.toArray(), [30, 40]);

			this.assert_eq(rb.removeOrUndefined(), 30);
			this.assert_deep_eq(rb.toArray(), [40]);

			this.assert_eq(rb.removeOrUndefined(), 40);
			this.assert_deep_eq(rb.toArray(), []);

			this.assert_eq(rb.removeOrUndefined(), undefined);
			this.assert_deep_eq(rb.toArray(), []);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this.assert_deep_eq(rb.toArray(), [1, 2, 3]);

			this.assert_eq(rb.putOrReplace(10), undefined);
			this.assert_deep_eq(rb.toArray(), [1, 2, 3, 10]);

			this.assert_eq(rb.putOrReplace(20), 1);
			this.assert_deep_eq(rb.toArray(), [2, 3, 10, 20]);

			this.assert_eq(rb.putOrReplace(30), 2);
			this.assert_deep_eq(rb.toArray(), [3, 10, 20, 30]);

			this.assert_eq(rb.removeOrUndefined(), 3);
			this.assert_deep_eq(rb.toArray(), [10, 20, 30]);

			this.assert_eq(rb.removeOrUndefined(), 10);
			this.assert_deep_eq(rb.toArray(), [20, 30]);

			this.assert_eq(rb.removeOrUndefined(), 20);
			this.assert_deep_eq(rb.toArray(), [30]);

			this.assert_eq(rb.removeOrUndefined(), 30);
			this.assert_deep_eq(rb.toArray(), []);

			this.assert_eq(rb.removeOrUndefined(), undefined);
			this.assert_deep_eq(rb.toArray(), []);
		}
	}
}
export let testClass = BaseRingBuffer;
