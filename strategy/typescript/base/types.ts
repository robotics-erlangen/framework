/**************************************************************************
*   Copyright 2020 Andreas Wendler, Paul Bergmann                         *
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

import { Robot } from "base/robot";
import { Vector } from "base/vector";

/**
 * Bind every constructor parameter except the first to certain values.
 *
 * @param ctor - The class that should be parameterized
 * @param ...tail - All parameters to ctor, except the first
 * @returns a class that can be constructed with just the first constructor
 *          parameter of `ctor`
 */
export function parameterizeClass<
	TargetType extends object,
	HeadArg extends any,
	TailArgs extends any[],
>(ctor: new(head: HeadArg, ...tail: TailArgs) => TargetType, ...tail: TailArgs) {
	/**
	 * The casts are necessary, since generic class types are not allowed to be
	 * extended.
	 * @see https://github.com/microsoft/TypeScript/issues/4890#issuecomment-141879451
	 */
	const castedCtor = ctor as new(head: HeadArg, ...tail: TailArgs) => object;
	const parameterizedCtor = class extends castedCtor {
		constructor(head: HeadArg) {
			super(head, ...tail);
		}
	} as new(head: HeadArg) => TargetType;

	/* Callers/later users may want to query the name of the returned class
	 * (e.g. through instances via this.constructor.name or through the class
	 * itself via parameterizeClass(...).name)
	 *
	 * The class does not inherit the name (it is anonymous), thus we need to
	 * pass through the name. The field is not writable by normal means, thus
	 * we need to use Object.defineProperty. It would also be possible to add a
	 * static computed property, however TypeScript prohibits this.
	 *
	 * The property descriptor is configured like the default descriptor for
	 * the name field.
	 */
	Object.defineProperty(parameterizedCtor, "name", {
		"configurable": true,
		"enumerable": false,
		"value": ctor.name,
		"writable": false,
	});

	return parameterizedCtor;
}

declare global {
	type ReadonlyRec<T> = T extends Map<infer K, infer V> ?
		ReadonlyMap<ReadonlyRec<K>, ReadonlyRec<V>> :
		T extends Robot ? T : T extends Vector ? T : {
			readonly [P in keyof T]: ReadonlyRec<T[P]>;
		};

	type ValueType<T> = T extends Map<infer _, infer V>
		? V
		: T extends (infer V)[]
		? V
		: never;

	/**
	 * Converts a union type to an intersection type, i.e. converts `a | b` to `a & b`
	 *
	 * This uses two features of conditional types: distribution of unions and
	 * inference of types in contravariant positions.
	 *
	 * To use distribution, a type variable has to preceed the extends clause.
	 * Thus, we just write `U extends any` (a condition that is always true) to
	 * trigger distribution.
	 *
	 * First, the given union is converted to a union of functions, e.g.
	 * `number | string` becomes `(k: number) => void | (k: string) => void`
	 *
	 * Then, the function parameter types are inferred and since they are in
	 * contravariant position, an intersection type is inferred.
	 * In other words: what to you need to call a
	 * ```
	 * (k: number) => void | (k: string) => void
	 * ```
	 * Something that is assignable to the parameter of both functions. And
	 * that type is their intersection
	 *
	 * @see https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html
	 */
	type UnionToIntersection<U> =
		(U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;
}
