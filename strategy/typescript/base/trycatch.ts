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

type CatchFunc<T> = (error: any, e: T) => boolean;
type ThenFunc<T> = (e: T) => void;

let log: Function;

function tryCatchThenEle<T>(tryF: () => void,  thenF: ThenFunc<T>, catchF: CatchFunc<T>, ele: T): void {
	amunLocal.tryCatch(tryF, thenF, catchF, ele);
}

function ignoreThen(e: any): void {
}

function ignoreCatch(e: any): boolean {
	return false; // ignore does not handle the problem
}

function notifyCatch(error: any, e: [boolean]): boolean {
	e[0] = true;
	return false; // notify does not handle the problem, either
}

function doCatch(catchClause: (error: any) => void): CatchFunc<any> {
	return (err: any, e2: any) => {catchClause(err); return true;};
}

export function pcall(tryF: () => void): boolean {
	let ele: [boolean] = [false];
	tryCatchThenEle(tryF, ignoreThen, notifyCatch, ele);
	return ele[0];
}

export function tryCatch(tryF: () => void, catchF: (err: any) => void): void {
	tryCatchThenEle(tryF, ignoreThen, doCatch(catchF), []);
}

export function tryCatchThen(tryF: () => void, catchF: (err: any) => void, thenF: () => void): void {
	tryCatchThenEle(tryF, thenF, doCatch(catchF), []);
}
