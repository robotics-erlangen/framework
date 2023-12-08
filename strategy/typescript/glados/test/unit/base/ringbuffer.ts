import { RingBuffer, AccumNumberRingBuffer, AccumVectorRingBuffer } from "base/ringbuffer";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseRingBuffer extends UnitTest {
	public constructor() {
		super();
		this.addTest("new RingBuffer", this.testConstructor);
		this.addTest("RingBuffer.isEmptyFull", this.testIsEmptyFull);
		this.addTest("RingBuffer.clear", this.testClear);
		this.addTest("RingBuffer.removeOrUndefined", this.testRemoveOrUndefined);
		this.addTest("RingBuffer.remove", this.testRemove);
		this.addTest("RingBuffer.putOrReplace", this.testPutOrReplace);
		this.addTest("RingBuffer.put", this.testPut);
		this.addTest("RingBuffer.peekOrUndefined", this.testPeekOrUndefined);
		this.addTest("RingBuffer.peek", this.testPeek);
		this.addTest("RingBuffer.toArray", this.testToArray);

		this.addTest("new AccumNumberRingBuffer", this.testConstructorAccumNumber);
		this.addTest("AccumNumberRingBuffer.clear", this.testClearAccumNumber);
		this.addTest("AccumNumberRingBuffer.removeOrUndefined", this.testRemoveOrUndefinedAccumNumber);
		this.addTest("AccumNumberRingBuffer.putOrReplace", this.testPutOrReplaceAccumNumber);
		this.addTest("AccumNumberRingBuffer.mean", this.testMeanAccumNumber);
		this.addTest("AccumNumberRingBuffer.variance", this.testVarianceAccumNumber);

		this.addTest("new AccumVectorRingBuffer", this.testConstructorAccumVector);
		this.addTest("AccumVectorRingBuffer.clear", this.testClearAccumVector);
		this.addTest("AccumVectorRingBuffer.removeOrUndefined", this.testRemoveOrUndefinedAccumVector);
		this.addTest("AccumVectorRingBuffer.putOrReplace", this.testPutOrReplaceAccumVector);
		this.addTest("AccumVectorRingBuffer.mean", this.testMeanAccumVector);
		this.addTest("AccumVectorRingBuffer.variance", this.testVarianceAccumVector);
	}

	private testConstructor() {
		{
			const rb = new RingBuffer(12);
			this.assert_eq(rb.capacity, 12);
			this.assert_eq(rb.length, 0);
		}

		{
			const rb = new RingBuffer(10, [1, 2, 3]);
			this.assert_eq(rb.capacity, 10);
			this.assert_eq(rb.length, 3);
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
		this.assert_eq(rb.length, 3);
		rb.clear();
		this.assert_eq(rb.length, 0);
	}

	private testRemoveOrUndefined() {
		{
			const rb = new RingBuffer(2);
			this.assert_eq(rb.length, 0);
			this.assert_undefined(rb.removeOrUndefined());
			this.assert_eq(rb.length, 0);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this.assert_eq(rb.length, 3);

			this.assert_eq(rb.removeOrUndefined(), 1);
			this.assert_eq(rb.length, 2);

			this.assert_eq(rb.removeOrUndefined(), 2);
			this.assert_eq(rb.length, 1);

			this.assert_eq(rb.removeOrUndefined(), 3);
			this.assert_eq(rb.length, 0);

			this.assert_undefined(rb.removeOrUndefined());
			this.assert_eq(rb.length, 0);
		}
	}

	private testRemove() {
		{
			const rb = new RingBuffer(3);
			this.assert_eq(rb.length, 0);
			this.assert_error(() => rb.remove());
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this.assert_eq(rb.length, 3);

			this.assert_eq(rb.remove(), 1);
			this.assert_eq(rb.length, 2);

			this.assert_eq(rb.remove(), 2);
			this.assert_eq(rb.length, 1);

			this.assert_eq(rb.remove(), 3);
			this.assert_eq(rb.length, 0);

			this.assert_error(() => rb.remove());
			this.assert_eq(rb.length, 0);
		}
	}

	private testPutOrReplace() {
		{
			const rb = new RingBuffer(3);

			rb.putOrReplace(1);
			this.assert_eq(rb.length, 1);
			this.assert_deep_eq(rb.toArray(), [1]);

			rb.putOrReplace(2);
			this.assert_eq(rb.length, 2);
			this.assert_deep_eq(rb.toArray(), [1, 2]);

			rb.putOrReplace(3);
			this.assert_eq(rb.length, 3);
			this.assert_deep_eq(rb.toArray(), [1, 2, 3]);

			rb.putOrReplace(4);
			this.assert_eq(rb.length, 3);
			this.assert_deep_eq(rb.toArray(), [2, 3, 4]);

			rb.putOrReplace(5);
			this.assert_eq(rb.length, 3);
			this.assert_deep_eq(rb.toArray(), [3, 4, 5]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			rb.putOrReplace(4);
			this.assert_eq(rb.length, 4);
			this.assert_deep_eq(rb.toArray(), [1, 2, 3, 4]);

			rb.putOrReplace(5);
			this.assert_eq(rb.length, 4);
			this.assert_deep_eq(rb.toArray(), [2, 3, 4, 5]);
		}
	}

	private testPut() {
		{
			const rb = new RingBuffer(3);

			rb.put(1);
			this.assert_eq(rb.length, 1);

			rb.put(2);
			this.assert_eq(rb.length, 2);

			rb.put(3);
			this.assert_eq(rb.length, 3);

			this.assert_error(() => rb.put(4));
			this.assert_eq(rb.length, 3);

			this.assert_deep_eq(rb.toArray(), [1, 2, 3]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			rb.put(4);
			this.assert_eq(rb.length, 4);

			this.assert_error(() => rb.put(5));
			this.assert_eq(rb.length, 4);

			this.assert_deep_eq(rb.toArray(), [1, 2, 3, 4]);
		}
	}

	private testPeekOrUndefined() {
		{
			const rb = new RingBuffer(3);

			this.assert_undefined(rb.peekOrUndefined());

			rb.put(1);
			this.assert_eq(rb.length, 1);

			this.assert_eq(rb.peekOrUndefined(0, "old"), 1);
			this.assert_undefined(rb.peekOrUndefined(1, "old"));
			this.assert_undefined(rb.peekOrUndefined(2, "old"));

			this.assert_eq(rb.peekOrUndefined(0, "new"), 1);
			this.assert_undefined(rb.peekOrUndefined(1, "new"));
			this.assert_undefined(rb.peekOrUndefined(2, "new"));

			rb.put(2);
			this.assert_eq(rb.length, 2);

			this.assert_eq(rb.peekOrUndefined(0, "old"), 1);
			this.assert_eq(rb.peekOrUndefined(1, "old"), 2);
			this.assert_undefined(rb.peekOrUndefined(2, "old"));
			this.assert_eq(rb.peekOrUndefined(0, "new"), 2);
			this.assert_eq(rb.peekOrUndefined(1, "new"), 1);
			this.assert_undefined(rb.peekOrUndefined(2, "new"));

			rb.put(3);
			this.assert_eq(rb.length, 3);

			this.assert_eq(rb.peekOrUndefined(0, "old"), 1);
			this.assert_eq(rb.peekOrUndefined(1, "old"), 2);
			this.assert_eq(rb.peekOrUndefined(2, "old"), 3);
			this.assert_eq(rb.peekOrUndefined(0, "new"), 3);
			this.assert_eq(rb.peekOrUndefined(1, "new"), 2);
			this.assert_eq(rb.peekOrUndefined(2, "new"), 1);

			this.assert_eq(rb.remove(), 1);
			this.assert_eq(rb.length, 2);

			this.assert_eq(rb.peekOrUndefined(0, "old"), 2);
			this.assert_eq(rb.peekOrUndefined(0, "old"), 2);
			this.assert_eq(rb.peekOrUndefined(1, "old"), 3);
			this.assert_undefined(rb.peekOrUndefined(2, "old"));
			this.assert_eq(rb.peekOrUndefined(0, "new"), 3);
			this.assert_eq(rb.peekOrUndefined(0, "new"), 3);
			this.assert_eq(rb.peekOrUndefined(1, "new"), 2);
			this.assert_undefined(rb.peekOrUndefined(2, "new"));

			this.assert_deep_eq(rb.toArray(), [2, 3]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			this.assert_eq(rb.peekOrUndefined(), 1);
			rb.put(4);
			this.assert_eq(rb.peekOrUndefined(), 1);
			this.assert_eq(rb.remove(), 1);
			this.assert_eq(rb.peekOrUndefined(), 2);

			this.assert_deep_eq(rb.toArray(), [2, 3, 4]);
		}
	}

	private testPeek() {
		{
			const rb = new RingBuffer(3);
			this.assert_eq(rb.length, 0);
			this.assert_error(() => rb.peek());
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this.assert_eq(rb.length, 3);
			this.assert_error(() => rb.peek(-1));
			this.assert_error(() => rb.peek(-2));

			this.assert_eq(rb.peek(0, "old"), 1);
			this.assert_eq(rb.peek(1, "old"), 2);
			this.assert_eq(rb.peek(2, "old"), 3);
			this.assert_error(() => rb.peek(3, "old"));
			this.assert_error(() => rb.peek(3, "new"));
			this.assert_eq(rb.peek(2, "new"), 1);
			this.assert_eq(rb.peek(1, "new"), 2);
			this.assert_eq(rb.peek(0, "new"), 3);

			this.assert_undefined(rb.putOrReplace(4));

			this.assert_eq(rb.peek(0, "old"), 1);
			this.assert_eq(rb.peek(1, "old"), 2);
			this.assert_eq(rb.peek(2, "old"), 3);
			this.assert_eq(rb.peek(3, "old"), 4);
			this.assert_eq(rb.peek(3, "new"), 1);
			this.assert_eq(rb.peek(2, "new"), 2);
			this.assert_eq(rb.peek(1, "new"), 3);
			this.assert_eq(rb.peek(0, "new"), 4);

			this.assert_eq(rb.putOrReplace(5), 1);

			this.assert_eq(rb.peek(0, "old"), 2);
			this.assert_eq(rb.peek(1, "old"), 3);
			this.assert_eq(rb.peek(2, "old"), 4);
			this.assert_eq(rb.peek(3, "old"), 5);
			this.assert_eq(rb.peek(3, "new"), 2);
			this.assert_eq(rb.peek(2, "new"), 3);
			this.assert_eq(rb.peek(1, "new"), 4);
			this.assert_eq(rb.peek(0, "new"), 5);

			this.assert_eq(rb.putOrReplace(6), 2);

			this.assert_eq(rb.peek(0, "old"), 3);
			this.assert_eq(rb.peek(1, "old"), 4);
			this.assert_eq(rb.peek(2, "old"), 5);
			this.assert_eq(rb.peek(3, "old"), 6);
			this.assert_eq(rb.peek(3, "new"), 3);
			this.assert_eq(rb.peek(2, "new"), 4);
			this.assert_eq(rb.peek(1, "new"), 5);
			this.assert_eq(rb.peek(0, "new"), 6);

			this.assert_eq(rb.removeOrUndefined(), 3);

			this.assert_eq(rb.peek(0, "old"), 4);
			this.assert_eq(rb.peek(1, "old"), 5);
			this.assert_eq(rb.peek(2, "old"), 6);
			this.assert_error(() => rb.peek(3, "old"));
			this.assert_error(() => rb.peek(3, "new"));
			this.assert_eq(rb.peek(2, "new"), 4);
			this.assert_eq(rb.peek(1, "new"), 5);
			this.assert_eq(rb.peek(0, "new"), 6);
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


	private testConstructorAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this.assert_eq(rb.total, 0);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this.assert_eq(rb.total, 6);
		}
	}

	private testClearAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this.assert_eq(rb.total, 6);
			rb.clear();
			this.assert_eq(rb.total, 0);
		}
	}

	private testRemoveOrUndefinedAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this.assert_eq(rb.total, 0);
			this.assert_undefined(rb.removeOrUndefined());
			this.assert_eq(rb.total, 0);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this.assert_eq(rb.total, 6);
			this.assert_eq(rb.removeOrUndefined(), 1);
			this.assert_eq(rb.total, 5);
		}
	}

	private testPutOrReplaceAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this.assert_eq(rb.total, 0);
			this.assert_undefined(rb.putOrReplace(10));
			this.assert_eq(rb.total, 10);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this.assert_eq(rb.total, 6);
			this.assert_undefined(rb.putOrReplace(4));
			this.assert_eq(rb.total, 10);
		}

		{
			const rb = new AccumNumberRingBuffer(3, [1, 2, 3]);
			this.assert_eq(rb.total, 6);
			this.assert_eq(rb.putOrReplace(4), 1);
			this.assert_eq(rb.total, 9);
		}
	}

	private testMeanAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this.assert_undefined(rb.mean());
			this.assert_undefined(rb.putOrReplace(10));
			this.assert_eq(rb.mean()!, 10);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this.assert_eq(rb.mean(), 2);
			this.assert_undefined(rb.putOrReplace(4));
			this.assert_eq(rb.mean(), 2.5);
		}

		{
			const rb = new AccumNumberRingBuffer(3, [1, 2, 3]);
			this.assert_eq(rb.mean(), 2);
			this.assert_eq(rb.putOrReplace(4), 1);
			this.assert_eq(rb.mean(), 3);
		}
	}

	private testVarianceAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this.assert_undefined(rb.variance());
			this.assert_undefined(rb.putOrReplace(10));
			this.assert_undefined(rb.variance());
			this.assert_undefined(rb.putOrReplace(10));
			this.assert_eq(rb.variance(), 0);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [2, 2, 5]);
			this.assert_eq(rb.mean(), 3);
			this.assert_eq(rb.variance(), 3);
			this.assert_eq(rb.remove(), 2);
			this.assert_eq(rb.remove(), 2);
			this.assert_undefined(rb.variance());
		}

		{
			const rb = new AccumNumberRingBuffer(3, [1, 2, 3]);
			this.assert_eq(rb.mean(), 2);
			this.assert_eq(rb.variance(), 1);
			this.assert_eq(rb.putOrReplace(4), 1);
			this.assert_eq(rb.mean(), 3);
			this.assert_eq(rb.variance(), 2.5);
		}

		{
			const rb = new AccumNumberRingBuffer(4, [17, 12, -5, 8]);
			this.assert_eq(rb.mean(), 8);
			this.assert_eq_eps(rb.variance()!, (9 ** 2 + 4 ** 2 + 13 ** 2 + 0 ** 2) / 3, 1e-7);
		}
	}


	private testConstructorAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this.assert_vector_eq(rb.total, new Vector(0, 0));
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this.assert_vector_eq(rb.total, new Vector(3, 3));
		}
	}

	private testClearAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this.assert_vector_eq(rb.total, new Vector(3, 3));
			rb.clear();
			this.assert_vector_eq(rb.total, new Vector(0, 0));
		}
	}

	private testRemoveOrUndefinedAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this.assert_vector_eq(rb.total, new Vector(0, 0));
			this.assert_undefined(rb.removeOrUndefined());
			this.assert_vector_eq(rb.total, new Vector(0, 0));
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this.assert_vector_eq(rb.total, new Vector(3, 3));
			this.assert_vector_eq(rb.removeOrUndefined()!, new Vector(1, 0));
			this.assert_vector_eq(rb.total, new Vector(2, 3));
		}
	}

	private testPutOrReplaceAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this.assert_vector_eq(rb.total, new Vector(0, 0));
			this.assert_undefined(rb.putOrReplace(new Vector(10, 1)));
			this.assert_vector_eq(rb.total, new Vector(10, 1));
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this.assert_vector_eq(rb.total, new Vector(3, 3));
			this.assert_undefined(rb.putOrReplace(new Vector(4, 0)));
			this.assert_vector_eq(rb.total, new Vector(7, 3));
		}

		{
			const rb = new AccumVectorRingBuffer(3, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this.assert_vector_eq(rb.total, new Vector(3, 3));
			this.assert_vector_eq(rb.putOrReplace(new Vector(4, 0))!, new Vector(1, 0));
			this.assert_vector_eq(rb.total, new Vector(6, 3));
		}
	}

	private testMeanAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this.assert_undefined(rb.mean());
			this.assert_undefined(rb.putOrReplace(new Vector(10, 1)));
			this.assert_vector_eq(rb.mean()!, new Vector(10, 1));
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this.assert_vector_eq(rb.mean()!, new Vector(1, 1));
			this.assert_undefined(rb.putOrReplace(new Vector(5, 5)));
			this.assert_vector_eq(rb.mean()!, new Vector(2, 2));
		}

		{
			const rb = new AccumVectorRingBuffer(3, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this.assert_vector_eq(rb.mean()!, new Vector(1, 1));
			this.assert_vector_eq(rb.putOrReplace(new Vector(4, 0))!, new Vector(1, 0));
			this.assert_vector_eq(rb.mean()!, new Vector(2, 1));
		}
	}

	private testVarianceAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this.assert_undefined(rb.variance());
			this.assert_undefined(rb.putOrReplace(new Vector(2, -5)));
			this.assert_undefined(rb.variance());
			this.assert_undefined(rb.putOrReplace(new Vector(2, -5)));
			this.assert_eq(rb.variance(), 0);
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(2, 0), new Vector(2, 0), new Vector(5, 0)]);
			this.assert_vector_eq(rb.mean()!, new Vector(3, 0));
			this.assert_eq(rb.variance(), 3);
			this.assert_vector_eq(rb.remove(), new Vector(2, 0));
			this.assert_vector_eq(rb.remove(), new Vector(2, 0));
			this.assert_undefined(rb.variance());
		}

		{
			const rb = new AccumVectorRingBuffer(3, [new Vector(0, 1), new Vector(0, 2), new Vector(0, 3)]);
			this.assert_vector_eq(rb.mean()!, new Vector(0, 2));
			this.assert_eq(rb.variance(), 1);
			this.assert_vector_eq(rb.putOrReplace(new Vector(0, 4))!, new Vector(0, 1));
			this.assert_vector_eq(rb.mean()!, new Vector(0, 3));
			this.assert_eq(rb.variance(), 2.5);
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(0, 1), new Vector(3, 1), new Vector(6, 3), new Vector(11, 3)]);
			this.assert_vector_eq(rb.mean()!, new Vector(5, 2));
			this.assert_eq_eps(rb.variance()!, (5 ** 2 + 2 ** 2 + 1 ** 2 + 6 ** 2 + 1 ** 2 + 1 ** 2 + 1 ** 2 + 1 ** 2) / 3, 1e-7);
		}
	}

}
export let testClass = BaseRingBuffer;
