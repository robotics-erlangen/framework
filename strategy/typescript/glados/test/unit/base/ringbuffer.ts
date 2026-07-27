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

import { RingBuffer, AccumNumberRingBuffer, AccumVectorRingBuffer } from "base/ringbuffer";
import { Vector } from "base/vector";

import { UnitTest } from "glados/test/unit/unittest";

export class BaseRingBuffer extends UnitTest {
	public constructor() {
		super();
		this._addTest("new RingBuffer", this._testConstructor);
		this._addTest("RingBuffer.isEmptyFull", this._testIsEmptyFull);
		this._addTest("RingBuffer.clear", this._testClear);
		this._addTest("RingBuffer.removeOrUndefined", this._testRemoveOrUndefined);
		this._addTest("RingBuffer.remove", this._testRemove);
		this._addTest("RingBuffer.putOrReplace", this._testPutOrReplace);
		this._addTest("RingBuffer.put", this._testPut);
		this._addTest("RingBuffer.peekOrUndefined", this._testPeekOrUndefined);
		this._addTest("RingBuffer.peek", this._testPeek);
		this._addTest("RingBuffer.toArray", this._testToArray);

		this._addTest("new AccumNumberRingBuffer", this._testConstructorAccumNumber);
		this._addTest("AccumNumberRingBuffer.clear", this._testClearAccumNumber);
		this._addTest("AccumNumberRingBuffer.removeOrUndefined", this._testRemoveOrUndefinedAccumNumber);
		this._addTest("AccumNumberRingBuffer.putOrReplace", this._testPutOrReplaceAccumNumber);
		this._addTest("AccumNumberRingBuffer.mean", this._testMeanAccumNumber);
		this._addTest("AccumNumberRingBuffer.variance", this._testVarianceAccumNumber);

		this._addTest("new AccumVectorRingBuffer", this._testConstructorAccumVector);
		this._addTest("AccumVectorRingBuffer.clear", this._testClearAccumVector);
		this._addTest("AccumVectorRingBuffer.removeOrUndefined", this._testRemoveOrUndefinedAccumVector);
		this._addTest("AccumVectorRingBuffer.putOrReplace", this._testPutOrReplaceAccumVector);
		this._addTest("AccumVectorRingBuffer.mean", this._testMeanAccumVector);
		this._addTest("AccumVectorRingBuffer.variance", this._testVarianceAccumVector);
	}

	private _testConstructor() {
		{
			const rb = new RingBuffer(12);
			this._assert_eq(rb.capacity, 12);
			this._assert_eq(rb.length, 0);
		}

		{
			const rb = new RingBuffer(10, [1, 2, 3]);
			this._assert_eq(rb.capacity, 10);
			this._assert_eq(rb.length, 3);
		}

		this._assert_error(() => new RingBuffer(0));
		this._assert_error(() => new RingBuffer(-1));
		this._assert_error(() => new RingBuffer(2, [1, 2, 3]));
	}

	private _testIsEmptyFull() {
		{
			const rb = new RingBuffer(2);
			this._assert_true(rb.isEmpty());
			this._assert_false(rb.isFull());

			rb.put(12);

			this._assert_false(rb.isEmpty());
			this._assert_false(rb.isFull());

			rb.put(12);

			this._assert_false(rb.isEmpty());
			this._assert_true(rb.isFull());
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this._assert_false(rb.isEmpty());
			this._assert_false(rb.isFull());

			rb.put(12);

			this._assert_false(rb.isEmpty());
			this._assert_true(rb.isFull());

			this._assert_eq(rb.remove(), 1);

			this._assert_false(rb.isEmpty());
			this._assert_false(rb.isFull());
		}
	}

	private _testClear() {
		const rb = new RingBuffer(4, [1, 2, 3]);
		this._assert_eq(rb.length, 3);
		rb.clear();
		this._assert_eq(rb.length, 0);
	}

	private _testRemoveOrUndefined() {
		{
			const rb = new RingBuffer(2);
			this._assert_eq(rb.length, 0);
			this._assert_undefined(rb.removeOrUndefined());
			this._assert_eq(rb.length, 0);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this._assert_eq(rb.length, 3);

			this._assert_eq(rb.removeOrUndefined(), 1);
			this._assert_eq(rb.length, 2);

			this._assert_eq(rb.removeOrUndefined(), 2);
			this._assert_eq(rb.length, 1);

			this._assert_eq(rb.removeOrUndefined(), 3);
			this._assert_eq(rb.length, 0);

			this._assert_undefined(rb.removeOrUndefined());
			this._assert_eq(rb.length, 0);
		}
	}

	private _testRemove() {
		{
			const rb = new RingBuffer(3);
			this._assert_eq(rb.length, 0);
			this._assert_error(() => rb.remove());
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this._assert_eq(rb.length, 3);

			this._assert_eq(rb.remove(), 1);
			this._assert_eq(rb.length, 2);

			this._assert_eq(rb.remove(), 2);
			this._assert_eq(rb.length, 1);

			this._assert_eq(rb.remove(), 3);
			this._assert_eq(rb.length, 0);

			this._assert_error(() => rb.remove());
			this._assert_eq(rb.length, 0);
		}
	}

	private _testPutOrReplace() {
		{
			const rb = new RingBuffer(3);

			rb.putOrReplace(1);
			this._assert_eq(rb.length, 1);
			this._assert_deep_eq(rb.toArray(), [1]);

			rb.putOrReplace(2);
			this._assert_eq(rb.length, 2);
			this._assert_deep_eq(rb.toArray(), [1, 2]);

			rb.putOrReplace(3);
			this._assert_eq(rb.length, 3);
			this._assert_deep_eq(rb.toArray(), [1, 2, 3]);

			rb.putOrReplace(4);
			this._assert_eq(rb.length, 3);
			this._assert_deep_eq(rb.toArray(), [2, 3, 4]);

			rb.putOrReplace(5);
			this._assert_eq(rb.length, 3);
			this._assert_deep_eq(rb.toArray(), [3, 4, 5]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			rb.putOrReplace(4);
			this._assert_eq(rb.length, 4);
			this._assert_deep_eq(rb.toArray(), [1, 2, 3, 4]);

			rb.putOrReplace(5);
			this._assert_eq(rb.length, 4);
			this._assert_deep_eq(rb.toArray(), [2, 3, 4, 5]);
		}
	}

	private _testPut() {
		{
			const rb = new RingBuffer(3);

			rb.put(1);
			this._assert_eq(rb.length, 1);

			rb.put(2);
			this._assert_eq(rb.length, 2);

			rb.put(3);
			this._assert_eq(rb.length, 3);

			this._assert_error(() => rb.put(4));
			this._assert_eq(rb.length, 3);

			this._assert_deep_eq(rb.toArray(), [1, 2, 3]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			rb.put(4);
			this._assert_eq(rb.length, 4);

			this._assert_error(() => rb.put(5));
			this._assert_eq(rb.length, 4);

			this._assert_deep_eq(rb.toArray(), [1, 2, 3, 4]);
		}
	}

	private _testPeekOrUndefined() {
		{
			const rb = new RingBuffer(3);

			this._assert_undefined(rb.peekOrUndefined());

			rb.put(1);
			this._assert_eq(rb.length, 1);

			this._assert_eq(rb.peekOrUndefined(0, "old"), 1);
			this._assert_undefined(rb.peekOrUndefined(1, "old"));
			this._assert_undefined(rb.peekOrUndefined(2, "old"));

			this._assert_eq(rb.peekOrUndefined(0, "new"), 1);
			this._assert_undefined(rb.peekOrUndefined(1, "new"));
			this._assert_undefined(rb.peekOrUndefined(2, "new"));

			rb.put(2);
			this._assert_eq(rb.length, 2);

			this._assert_eq(rb.peekOrUndefined(0, "old"), 1);
			this._assert_eq(rb.peekOrUndefined(1, "old"), 2);
			this._assert_undefined(rb.peekOrUndefined(2, "old"));
			this._assert_eq(rb.peekOrUndefined(0, "new"), 2);
			this._assert_eq(rb.peekOrUndefined(1, "new"), 1);
			this._assert_undefined(rb.peekOrUndefined(2, "new"));

			rb.put(3);
			this._assert_eq(rb.length, 3);

			this._assert_eq(rb.peekOrUndefined(0, "old"), 1);
			this._assert_eq(rb.peekOrUndefined(1, "old"), 2);
			this._assert_eq(rb.peekOrUndefined(2, "old"), 3);
			this._assert_eq(rb.peekOrUndefined(0, "new"), 3);
			this._assert_eq(rb.peekOrUndefined(1, "new"), 2);
			this._assert_eq(rb.peekOrUndefined(2, "new"), 1);

			this._assert_eq(rb.remove(), 1);
			this._assert_eq(rb.length, 2);

			this._assert_eq(rb.peekOrUndefined(0, "old"), 2);
			this._assert_eq(rb.peekOrUndefined(0, "old"), 2);
			this._assert_eq(rb.peekOrUndefined(1, "old"), 3);
			this._assert_undefined(rb.peekOrUndefined(2, "old"));
			this._assert_eq(rb.peekOrUndefined(0, "new"), 3);
			this._assert_eq(rb.peekOrUndefined(0, "new"), 3);
			this._assert_eq(rb.peekOrUndefined(1, "new"), 2);
			this._assert_undefined(rb.peekOrUndefined(2, "new"));

			this._assert_deep_eq(rb.toArray(), [2, 3]);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);

			this._assert_eq(rb.peekOrUndefined(), 1);
			rb.put(4);
			this._assert_eq(rb.peekOrUndefined(), 1);
			this._assert_eq(rb.remove(), 1);
			this._assert_eq(rb.peekOrUndefined(), 2);

			this._assert_deep_eq(rb.toArray(), [2, 3, 4]);
		}
	}

	private _testPeek() {
		{
			const rb = new RingBuffer(3);
			this._assert_eq(rb.length, 0);
			this._assert_error(() => rb.peek());
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this._assert_eq(rb.length, 3);
			this._assert_error(() => rb.peek(-1));
			this._assert_error(() => rb.peek(-2));

			this._assert_eq(rb.peek(0, "old"), 1);
			this._assert_eq(rb.peek(1, "old"), 2);
			this._assert_eq(rb.peek(2, "old"), 3);
			this._assert_error(() => rb.peek(3, "old"));
			this._assert_error(() => rb.peek(3, "new"));
			this._assert_eq(rb.peek(2, "new"), 1);
			this._assert_eq(rb.peek(1, "new"), 2);
			this._assert_eq(rb.peek(0, "new"), 3);

			this._assert_undefined(rb.putOrReplace(4));

			this._assert_eq(rb.peek(0, "old"), 1);
			this._assert_eq(rb.peek(1, "old"), 2);
			this._assert_eq(rb.peek(2, "old"), 3);
			this._assert_eq(rb.peek(3, "old"), 4);
			this._assert_eq(rb.peek(3, "new"), 1);
			this._assert_eq(rb.peek(2, "new"), 2);
			this._assert_eq(rb.peek(1, "new"), 3);
			this._assert_eq(rb.peek(0, "new"), 4);

			this._assert_eq(rb.putOrReplace(5), 1);

			this._assert_eq(rb.peek(0, "old"), 2);
			this._assert_eq(rb.peek(1, "old"), 3);
			this._assert_eq(rb.peek(2, "old"), 4);
			this._assert_eq(rb.peek(3, "old"), 5);
			this._assert_eq(rb.peek(3, "new"), 2);
			this._assert_eq(rb.peek(2, "new"), 3);
			this._assert_eq(rb.peek(1, "new"), 4);
			this._assert_eq(rb.peek(0, "new"), 5);

			this._assert_eq(rb.putOrReplace(6), 2);

			this._assert_eq(rb.peek(0, "old"), 3);
			this._assert_eq(rb.peek(1, "old"), 4);
			this._assert_eq(rb.peek(2, "old"), 5);
			this._assert_eq(rb.peek(3, "old"), 6);
			this._assert_eq(rb.peek(3, "new"), 3);
			this._assert_eq(rb.peek(2, "new"), 4);
			this._assert_eq(rb.peek(1, "new"), 5);
			this._assert_eq(rb.peek(0, "new"), 6);

			this._assert_eq(rb.removeOrUndefined(), 3);

			this._assert_eq(rb.peek(0, "old"), 4);
			this._assert_eq(rb.peek(1, "old"), 5);
			this._assert_eq(rb.peek(2, "old"), 6);
			this._assert_error(() => rb.peek(3, "old"));
			this._assert_error(() => rb.peek(3, "new"));
			this._assert_eq(rb.peek(2, "new"), 4);
			this._assert_eq(rb.peek(1, "new"), 5);
			this._assert_eq(rb.peek(0, "new"), 6);
		}
	}

	private _testToArray() {
		{
			const rb = new RingBuffer(3);
			this._assert_deep_eq(rb.toArray(), []);

			this._assert_eq(rb.putOrReplace(10), undefined);
			this._assert_deep_eq(rb.toArray(), [10]);

			this._assert_eq(rb.putOrReplace(20), undefined);
			this._assert_deep_eq(rb.toArray(), [10, 20]);

			this._assert_eq(rb.putOrReplace(30), undefined);
			this._assert_deep_eq(rb.toArray(), [10, 20, 30]);

			this._assert_eq(rb.putOrReplace(40), 10);
			this._assert_deep_eq(rb.toArray(), [20, 30, 40]);

			this._assert_eq(rb.removeOrUndefined(), 20);
			this._assert_deep_eq(rb.toArray(), [30, 40]);

			this._assert_eq(rb.removeOrUndefined(), 30);
			this._assert_deep_eq(rb.toArray(), [40]);

			this._assert_eq(rb.removeOrUndefined(), 40);
			this._assert_deep_eq(rb.toArray(), []);

			this._assert_eq(rb.removeOrUndefined(), undefined);
			this._assert_deep_eq(rb.toArray(), []);
		}

		{
			const rb = new RingBuffer(4, [1, 2, 3]);
			this._assert_deep_eq(rb.toArray(), [1, 2, 3]);

			this._assert_eq(rb.putOrReplace(10), undefined);
			this._assert_deep_eq(rb.toArray(), [1, 2, 3, 10]);

			this._assert_eq(rb.putOrReplace(20), 1);
			this._assert_deep_eq(rb.toArray(), [2, 3, 10, 20]);

			this._assert_eq(rb.putOrReplace(30), 2);
			this._assert_deep_eq(rb.toArray(), [3, 10, 20, 30]);

			this._assert_eq(rb.removeOrUndefined(), 3);
			this._assert_deep_eq(rb.toArray(), [10, 20, 30]);

			this._assert_eq(rb.removeOrUndefined(), 10);
			this._assert_deep_eq(rb.toArray(), [20, 30]);

			this._assert_eq(rb.removeOrUndefined(), 20);
			this._assert_deep_eq(rb.toArray(), [30]);

			this._assert_eq(rb.removeOrUndefined(), 30);
			this._assert_deep_eq(rb.toArray(), []);

			this._assert_eq(rb.removeOrUndefined(), undefined);
			this._assert_deep_eq(rb.toArray(), []);
		}
	}


	private _testConstructorAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this._assert_eq(rb.total, 0);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this._assert_eq(rb.total, 6);
		}
	}

	private _testClearAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this._assert_eq(rb.total, 6);
			rb.clear();
			this._assert_eq(rb.total, 0);
		}
	}

	private _testRemoveOrUndefinedAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this._assert_eq(rb.total, 0);
			this._assert_undefined(rb.removeOrUndefined());
			this._assert_eq(rb.total, 0);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this._assert_eq(rb.total, 6);
			this._assert_eq(rb.removeOrUndefined(), 1);
			this._assert_eq(rb.total, 5);
		}
	}

	private _testPutOrReplaceAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this._assert_eq(rb.total, 0);
			this._assert_undefined(rb.putOrReplace(10));
			this._assert_eq(rb.total, 10);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this._assert_eq(rb.total, 6);
			this._assert_undefined(rb.putOrReplace(4));
			this._assert_eq(rb.total, 10);
		}

		{
			const rb = new AccumNumberRingBuffer(3, [1, 2, 3]);
			this._assert_eq(rb.total, 6);
			this._assert_eq(rb.putOrReplace(4), 1);
			this._assert_eq(rb.total, 9);
		}
	}

	private _testMeanAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this._assert_undefined(rb.mean());
			this._assert_undefined(rb.putOrReplace(10));
			this._assert_eq(rb.mean()!, 10);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [1, 2, 3]);
			this._assert_eq(rb.mean(), 2);
			this._assert_undefined(rb.putOrReplace(4));
			this._assert_eq(rb.mean(), 2.5);
		}

		{
			const rb = new AccumNumberRingBuffer(3, [1, 2, 3]);
			this._assert_eq(rb.mean(), 2);
			this._assert_eq(rb.putOrReplace(4), 1);
			this._assert_eq(rb.mean(), 3);
		}
	}

	private _testVarianceAccumNumber() {
		{
			const rb = new AccumNumberRingBuffer(12);
			this._assert_undefined(rb.variance());
			this._assert_undefined(rb.putOrReplace(10));
			this._assert_undefined(rb.variance());
			this._assert_undefined(rb.putOrReplace(10));
			this._assert_eq(rb.variance(), 0);
		}

		{
			const rb = new AccumNumberRingBuffer(10, [2, 2, 5]);
			this._assert_eq(rb.mean(), 3);
			this._assert_eq(rb.variance(), 3);
			this._assert_eq(rb.remove(), 2);
			this._assert_eq(rb.remove(), 2);
			this._assert_undefined(rb.variance());
		}

		{
			const rb = new AccumNumberRingBuffer(3, [1, 2, 3]);
			this._assert_eq(rb.mean(), 2);
			this._assert_eq(rb.variance(), 1);
			this._assert_eq(rb.putOrReplace(4), 1);
			this._assert_eq(rb.mean(), 3);
			this._assert_eq(rb.variance(), 2.5);
		}

		{
			const rb = new AccumNumberRingBuffer(4, [17, 12, -5, 8]);
			this._assert_eq(rb.mean(), 8);
			this._assert_eq_eps(rb.variance()!, (9 ** 2 + 4 ** 2 + 13 ** 2 + 0 ** 2) / 3, 1e-7);
		}
	}


	private _testConstructorAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this._assert_vector_eq(rb.total, new Vector(0, 0));
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this._assert_vector_eq(rb.total, new Vector(3, 3));
		}
	}

	private _testClearAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this._assert_vector_eq(rb.total, new Vector(3, 3));
			rb.clear();
			this._assert_vector_eq(rb.total, new Vector(0, 0));
		}
	}

	private _testRemoveOrUndefinedAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this._assert_vector_eq(rb.total, new Vector(0, 0));
			this._assert_undefined(rb.removeOrUndefined());
			this._assert_vector_eq(rb.total, new Vector(0, 0));
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this._assert_vector_eq(rb.total, new Vector(3, 3));
			this._assert_vector_eq(rb.removeOrUndefined()!, new Vector(1, 0));
			this._assert_vector_eq(rb.total, new Vector(2, 3));
		}
	}

	private _testPutOrReplaceAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this._assert_vector_eq(rb.total, new Vector(0, 0));
			this._assert_undefined(rb.putOrReplace(new Vector(10, 1)));
			this._assert_vector_eq(rb.total, new Vector(10, 1));
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this._assert_vector_eq(rb.total, new Vector(3, 3));
			this._assert_undefined(rb.putOrReplace(new Vector(4, 0)));
			this._assert_vector_eq(rb.total, new Vector(7, 3));
		}

		{
			const rb = new AccumVectorRingBuffer(3, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this._assert_vector_eq(rb.total, new Vector(3, 3));
			this._assert_vector_eq(rb.putOrReplace(new Vector(4, 0))!, new Vector(1, 0));
			this._assert_vector_eq(rb.total, new Vector(6, 3));
		}
	}

	private _testMeanAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this._assert_undefined(rb.mean());
			this._assert_undefined(rb.putOrReplace(new Vector(10, 1)));
			this._assert_vector_eq(rb.mean()!, new Vector(10, 1));
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this._assert_vector_eq(rb.mean()!, new Vector(1, 1));
			this._assert_undefined(rb.putOrReplace(new Vector(5, 5)));
			this._assert_vector_eq(rb.mean()!, new Vector(2, 2));
		}

		{
			const rb = new AccumVectorRingBuffer(3, [new Vector(1, 0), new Vector(2, 0), new Vector(0, 3)]);
			this._assert_vector_eq(rb.mean()!, new Vector(1, 1));
			this._assert_vector_eq(rb.putOrReplace(new Vector(4, 0))!, new Vector(1, 0));
			this._assert_vector_eq(rb.mean()!, new Vector(2, 1));
		}
	}

	private _testVarianceAccumVector() {
		{
			const rb = new AccumVectorRingBuffer(12);
			this._assert_undefined(rb.variance());
			this._assert_undefined(rb.putOrReplace(new Vector(2, -5)));
			this._assert_undefined(rb.variance());
			this._assert_undefined(rb.putOrReplace(new Vector(2, -5)));
			this._assert_eq(rb.variance(), 0);
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(2, 0), new Vector(2, 0), new Vector(5, 0)]);
			this._assert_vector_eq(rb.mean()!, new Vector(3, 0));
			this._assert_eq(rb.variance(), 3);
			this._assert_vector_eq(rb.remove(), new Vector(2, 0));
			this._assert_vector_eq(rb.remove(), new Vector(2, 0));
			this._assert_undefined(rb.variance());
		}

		{
			const rb = new AccumVectorRingBuffer(3, [new Vector(0, 1), new Vector(0, 2), new Vector(0, 3)]);
			this._assert_vector_eq(rb.mean()!, new Vector(0, 2));
			this._assert_eq(rb.variance(), 1);
			this._assert_vector_eq(rb.putOrReplace(new Vector(0, 4))!, new Vector(0, 1));
			this._assert_vector_eq(rb.mean()!, new Vector(0, 3));
			this._assert_eq(rb.variance(), 2.5);
		}

		{
			const rb = new AccumVectorRingBuffer(10, [new Vector(0, 1), new Vector(3, 1), new Vector(6, 3), new Vector(11, 3)]);
			this._assert_vector_eq(rb.mean()!, new Vector(5, 2));
			this._assert_eq_eps(rb.variance()!, (5 ** 2 + 2 ** 2 + 1 ** 2 + 6 ** 2 + 1 ** 2 + 1 ** 2 + 1 ** 2 + 1 ** 2) / 3, 1e-7);
		}
	}

}
export let testClass = BaseRingBuffer;
