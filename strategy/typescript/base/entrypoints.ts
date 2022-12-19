/**
 * @module entrypoints
 * Class to add new Entrypoints
 */

/**************************************************************************
*   Copyright 2015 Michael Eischer, Christian Lobmeier, Andreas Wendler   *
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
*   along with this program.  if not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

type EntryPointFunction = () => boolean;
type EntryPointWrapper = (f: EntryPointFunction) => Function;

let entries: { [name: string]: EntryPointFunction } = {};

/**
 * Adds an entrypoint
 * @param name - Entrypoint name parts are seperated with '/'
 * @param func - Function to call for this entrypoint
 */
export function add(name: string, func: EntryPointFunction) {
	if (entries[name]) {
		throw new Error(`An entrypoint with name ${name} already exists`);
	}
	entries[name] = func;
}

/**
 * Returns the entrypoint list
 * The functions are wrapped using the wrapper function
 * which should call the basic runtime functions
 * @returns Entrypoints table for passing to Ra
 */
export function get(wrapper: EntryPointWrapper): { [name: string]: Function } {
	let wrapped: { [name: string]: Function } = {};
	for (let name in entries) {
		wrapped[name] = wrapper(entries[name]);
	}
	return wrapped;
}

