/**************************************************************************
*   Copyright 2019 Tobias Heineken,                                       *
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

let amunLocal = amun;

type CatchFunc<T> = (error: any, e: T) => void;
type ThenFunc<T> = (e: T) => void;

let log: Function;

function ignore(e: any): void {
}

function notifyCatch(error: any, e: [boolean]): void {
	e[0] = true;
}

export function pcall(tryF: () => void): boolean {
	let ele: [boolean] = [false];
	amunLocal.tryCatch(tryF, ignore, notifyCatch, ele, true);
	return ele[0];
}

export function tryCatch(tryF: () => void, catchF: (err: any) => void): void {
	amunLocal.tryCatch(tryF, ignore, catchF, [], false);
}

export function tryCatchThen(tryF: () => void, catchF: (err: any) => void, thenF: () => void): void {
	amunLocal.tryCatch(tryF, thenF, catchF, [], false);
}
