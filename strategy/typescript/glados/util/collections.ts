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


/**
 * Retrieve the first inserted value from a map
 * @param collection - the collection to retrieve from
 * @returns the first value inserted into collection, or undefined if the collection is empty
 */
export function head<K, V>(collection: Map<K, V>): [K, V] | undefined;
export function head<K, V>(collection: ReadonlyRec<Map<K, V>>): readonly [ReadonlyRec<K>, ReadonlyRec<V>] | undefined;
export function head<K, V>(collection: ReadonlyRec<Map<K, V>>): readonly [ReadonlyRec<K>, ReadonlyRec<V>] | undefined {
	const it = collection.entries().next();
	if (it.done) {
		return undefined;
	} else {
		return it.value;
	}
}
