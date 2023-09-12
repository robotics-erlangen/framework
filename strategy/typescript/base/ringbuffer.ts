/**
 * @module ringbuffer
 * RingBuffer class.
 */

/**************************************************************************
*   Copyright 2023 Christoph Schmidtmeier                                 *
*   Robotics Erlangen e.V.                                                *
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

/**
 * A ringbuffer is a queue of fixed size, a datastructure
 * to which you can append to one end and remove from the
 * other. If all slots are already in use, the oldest element
 * is overwritten.
 *
 * To create a ringbuffer of size N:
 *     const rb = new RingBuffer<string>(N);
 *
 * If you want the buffer to contain some values:
 *     const rb = new RingBuffer<string>(N, ["some", "value"]);
 * but make sure to pass at most N values.
 *
 * To add an element to the buffer:
 *     rb.put("new value");
 * or
 *     rb.putOrReplace("new value");
 * put will throw an error, whereas putOrReplace will silently
 * overwrite the oldest value if the buffer is full.
 *
 * To remove an element from the buffer:
 *     const value: string = rb.remove();
 * or
 *     const value: string | undefined = rb.removeOrUndefined();
 * or
 *     const value: string = rb.removeOrUndefined() ?? "default-value";
 * remove will throw an error, whereas removeOrUndefined will return
 * undefined if the buffer is empty.
 *
 * To read the buffer:
 *     const contents: string[] = rb.toArray();
 * or
 *     const nextValue: string = rb.peek();
 *     const nextAfterThat: string = rb.peek(1);
 *     const andAfterThat: string = rb.peek(2);
 * or
 *     const maybeNextValue: string = rb.peekOrUndefined(0);
 *     const maybeNextAfterThat: string = rb.peekOrUndefined(1);
 */
export class RingBuffer<T> {
	protected _buffer: (T | undefined)[] = [];
	protected _size: number = 0;
	protected _length: number = 0;
	private _read: number = 0;
	private _write: number = 0;

	/**
	 * Creates a ringbuffer of size, prepopulated with values
	 * @param size - The size of the ringbuffer
	 * @param values - optional, initial content of the ringbuffer
	 */
	constructor(size: number, values: T[] = []) {
		if (size <= 0) {
			throw Error(`Trying to create a ringbuffer of size ${size}`);
		}
		this._size = size;
		this._length = values.length;
		this._read = 0;
		this._write = values.length;

		// creates a buffer of size from values, copying the list
		if (values.length > size) {
			throw Error(`Too many initial values for ringbuffer, got ${values} as initial values for a ringbuffer of size ${size}`);
		}
		this._buffer = [...values];
		this._buffer.length = size;
	}

	/**
	 * Increments a number modulo the size of this ringbuffer
	 * @param x - the number to increment
	 * @param y - the increment, defaults to 1
	 * @returns (x + y) % size of the ringbuffer
	 */
	private _inc(x: number, y: number = 1): number {
		return (x + y) % this._size;
	}

	/**
	 * Run every time the queue is cleared
	 */
	protected _onClear() {}

	/**
	 * Run every time an element is removed
	 * @param element - The removed element
	 */
	protected _onRemove(element: T) {}

	/**
	 * Run every time an element is added
	 * @param element - The added element
	 */
	protected _onPut(element: T) {}

	/**
	 * Gets the maximum number of elements that can be in the ringbuffer at the same time
	 * @returns The size of the ringbuffer
	 */
	public get size(): number {
		return this._size;
	}

	/**
	 * Gets the current number of elements that are in the ringbuffer
	 * @returns The length of the ringbuffer
	 */
	public get length(): number {
		return this._length;
	}

	/**
	 * Returns true if the ringbuffer is emtpy
	 * @returns true if the ringbuffer is emtpy
	 */
	public isEmpty(): boolean {
		return this._length === 0;
	}

	/**
	 * Returns true if the ringbuffer is full
	 * @returns true if the ringbuffer is full
	 */
	public isFull(): boolean {
		return this._length === this._size;
	}

	/**
	 * Empties the ringbuffer
	 */
	public clear() {
		this._length = 0;
		this._buffer.length = 0;
		this._buffer.length = this._size;
		this._onClear();
	}

	/**
	 * Removes a values from the ringbuffer if possible, else returns undefined
	 * @returns The next value from the ringbuffer or undefined if the buffer is empty
	 */
	public removeOrUndefined(): T | undefined {
		if (this._length === 0) {
			return undefined;
		}

		const x = this._buffer[this._read]!;
		this._read = this._inc(this._read);
		this._length -= 1;
		this._onRemove(x);
		return x;
	}

	/**
	 * Removes a value from the ringbuffer if possible, else throws an error
	 * @returns The next value from the ringbuffer
	 */
	public remove(): T {
		if (this._length === 0) {
			throw Error("remove called on empty ringbuffer");
		}
		return this.removeOrUndefined()!;
	}

	/**
	 * Puts a value into the ringbuffer, possibly overwriting the oldest value if the ringbuffer is full
	 * @param x - The value to store
	 * @returns The overwritten value or undefined if the ringbuffer wasnt full
	 */
	public putOrReplace(x: T): T | undefined {
		const ret = (this._length === this._size) ? this.removeOrUndefined()! : undefined;

		this._buffer[this._write] = x;
		this._write = this._inc(this._write);
		this._length += 1;
		this._onPut(x);
		return ret;
	}

	/**
	 * Puts a value into the ringbuffer if possible, else throws an error
	 * @param x - The value to store
	 */
	public put(x: T) {
		if (this._length === this._size) {
			throw Error("put called on full ringbuffer");
		}
		this.putOrReplace(x);
	}

	/**
	 * Returns the next value to be read from the ringbuffer **after
	 * i remove operations** without removing it or undefined if
	 * the buffer is emtpy by then
	 * @param i - how many elements to skip, defaults to 0
	 * @returns The value or undefined if the buffer is empty
	 */
	public peekOrUndefined(i: number = 0): T | undefined {
		if (i < 0) {
			throw Error(`peekOrUndefined(${i}) called with negative argument`);
		}
		return i < this._length ? this._buffer[this._inc(this._read, i)] : undefined;
	}

	/**
	 * Returns the next value to be read from the ringbuffer **after
	 * i remove operations** without removing it, or throws an error
	 * if the buffer is emtpy by then
	 * @returns The value
	 */
	public peek(i: number = 0): T {
		if (i >= this._length) {
			throw Error(`peek(${i}) called on ringbuffer of size ${this._size}`);
		}
		return this.peekOrUndefined(i)!;
	}

	/**
	 * Returns a shallow copy of all values currently in the buffer, in the order they were added
	 * @returns An array containing all values currently in the buffer
	 */
	public toArray(): T[] {
		if (this._read + this._length <= this._size) {
			return this._buffer
				.slice(this._read, this._read + this._length)
				.map((x) => x!);
		} else {
			return [
				...this._buffer.slice(this._read, this._size),
				...this._buffer.slice(0, this._read + this._length - this._size)
			].map((x) => x!);
		}
	}


	/**
	 * Returns a string representation of the ringbuffer, used for base/debug
	 * @returns A string representation of the ringbuffer
	 */
	public _toString() {
		return `RingBuffer(size=${this._size}, ${this.toArray()})`;
	}

	/**
	 * Returns a string representation of the ringbuffer
	 * @returns A string representation of the ringbuffer
	 */
	public toString() {
		return this._toString();
	}
}


/**
 * In addition to the methods {@link RingBuffer} provides,
 * this class also keeps track of the running total of elements
 * that are currently in the buffer. See {@link AccumVectorRingBuffer}
 * for the same functionality for vectors.
 *
 * To access it, use:
 *     const sum = rb.total;
 *
 * To get the average, variance and standard deviation:
 *     const avg = rb.mean();
 *     const var = rb.variance();
 *     const std = rb.stdev();
 */
export class AccumNumberRingBuffer extends RingBuffer<number> {
	private _total: number = 0;

	/**
	 * Creates a ringbuffer of size, prepopulated with values
	 * @param size - The size of the ringbuffer
	 * @param values - optional, initial content of the ringbuffer
	 */
	constructor(size: number, values: number[] = []) {
		super(size, values);
		this._total = values.reduce((a, b) => a + b, 0);
	}

	protected _onClear() {
		this._total = 0;
	}

	protected _onRemove(element: number) {
		this._total -= element;
	}

	protected _onPut(element: number) {
		this._total += element;
	}

	/**
	 * Returns the sum of all elements in the ringbuffer
	 * @returns The sum of all elements in the ringbuffer
	 */
	public get total(): number {
		return this._total;
	}

	/**
	 * Returns the mean of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty
	 * @returns the mean of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty
	 */
	public mean(): number | undefined {
		return this._length === 0 ? undefined : this._total / this._length;
	}

	/**
	 * Returns the variance of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty or contains only one element
	 * @returns the variance of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty or contains only one element
	 */
	public variance(): number | undefined {
		if (this._length <= 1) {
			return undefined;
		}
		const mean = this.mean()!;
		return this
			.toArray()
			.map((x) => (x - mean) ** 2)
			.reduce((a, b) => a + b, 0)
			/ (this._length - 1);
	}

	/**
	 * Returns the standard deviation of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty or contains only one element
	 * @returns the standard deviation of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty or contains only one element
	 */
	public stdev(): number | undefined {
		const variance = this.variance();
		return variance === undefined ? undefined : Math.sqrt(variance);
	}

	/**
	 * Returns a string representation of the ringbuffer, used for base/debug
	 * @returns A string representation of the ringbuffer
	 */
	public _toString() {
		return `AccumNumberRingBuffer(size=${this._size}, total=${this._total}, ${this.toArray()})`;
	}
}

/**
 * In addition to the methods {@link RingBuffer} provides,
 * this class also keeps track of the running total of elements
 * that are currently in the buffer. See {@link AccumNumberRingBuffer}
 * for the same functionality for numbers.
 *
 * To access it, use:
 *     const sum = rb.total;
 *
 * To get the average, variance and standard deviation:
 *     const avg = rb.mean();
 *     const var = rb.variance();
 *     const std = rb.stdev();
 */
export class AccumVectorRingBuffer extends RingBuffer<Vector> {
	private _total: Vector = new Vector(0, 0);

	/**
	 * Creates a ringbuffer of size, prepopulated with values
	 * @param size - The size of the ringbuffer
	 * @param values - optional, initial content of the ringbuffer
	 */
	constructor(size: number, values: Vector[] = []) {
		super(size, values);
		this._total = values.reduce((a, b) => a + b, new Vector(0, 0));
	}

	protected _onClear() {
		this._total = new Vector(0, 0);
	}

	protected _onRemove(element: Vector) {
		this._total = this._total - element;
	}

	protected _onPut(element: Vector) {
		this._total = this._total + element;
	}

	/**
	 * Returns the sum of all elements in the ringbuffer
	 * @returns The sum of all elements in the ringbuffer
	 */
	public get total(): Vector {
		return this._total;
	}

	/**
	 * Returns the mean of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty
	 * @returns the mean of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty
	 */
	public mean(): Vector | undefined {
		return this._length === 0 ? undefined : this._total / this._length;
	}

	/**
	 * Returns the variance of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty or contains only one element
	 * @returns the variance of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty or contains only one element
	 */
	public variance(): number | undefined {
		if (this._length <= 1) {
			return undefined;
		}
		const mean = this.mean()!;
		return this
			.toArray()
			.map((x) => (x - mean).lengthSq())
			.reduce((a, b) => a + b, 0)
			/ (this._length - 1);
	}

	/**
	 * Returns the standard deviation of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty or contains only one element
	 * @returns the standard deviation of all elements in the ringbuffer,
	 * or undefined if the ringbuffer is empty or contains only one element
	 */
	public stdev(): number | undefined {
		const variance = this.variance();
		return variance === undefined ? undefined : Math.sqrt(variance);
	}

	/**
	 * Returns a string representation of the ringbuffer, used for base/debug
	 * @returns A string representation of the ringbuffer
	 */
	public _toString() {
		return `AccumVectorRingBuffer(size=${this._size}, total=${this._total}, ${this.toArray()})`;
	}
}
