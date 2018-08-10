/*
/// Functions to convert from global to strategy let coordinates and back.
// Only use to convert values from or for amun!
module "Coordinates"
*/

/**************************************************************************
*   Copyright 2018 Alexander Danzer, Michael Eischer, Andreas Wendler     *
*   Robotics Erlangen e.V.                                                *
*   http://www.robotics-erlangen.de/                                      *
*   info@robotics-erlangen.de                                             *
*                                                                         *
*   This program is free software: you can redistribute it and/or modify  *
*   it under the terms of the GNU General Public License as published by  *
*   the Free Software Foundation, either version 3 of the License, ||     *
*   any later version.                                                    *
*                                                                         *
*   This program is distributed in the hope that it will be useful,       *
*   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
*   MERCHANTABILITY || FITNESS FOR A PARTICULAR PURPOSE.  See the         *
*   GNU General Public License for more details.                          *
*                                                                         *
*   You should have received a copy of the GNU General Public License     *
*   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
**************************************************************************/

/// Converts global coordinates from amun to strategy let coordinates
// @class function
// @name toLocal
// @param data Vector/number - vector or angle to convert
// @return Vector/number

/*
separator for luadoc*/

/// Converts strategy let coordinates to global coordinates for amun
// @class function
// @name toGlobal
// @param data Vector/number - vector or angle to convert
// @return Vector/number

/*
separator for luadoc*/

/// Does toGlobal conversion for a list
// @class function
// @name listToGlobal
// @param data (Vector/number)[] - list to map
// @return (Vector/number)[]

/*
separator for luadoc*/

import {Vector} from "../base/vector";

interface CoordinatesType {
	toGlobal(pos: Vector): Vector;
	toGlobal(pos: Readonly<Vector>): Readonly<Vector>;
	toGlobal(num: number): number;
	toLocal(pos: Vector): Vector;
	toLocal(pos: Readonly<Vector>): Readonly<Vector>;
	toLocal(num: number): number;
	listToGlobal(pos: Vector[]): Vector[];
	listToGlobal(pos: Readonly<Vector>[]): Readonly<Vector>[];
	listToGlobal(num: number[]): number[];
};

class Invert implements CoordinatesType {
	toGlobal (data: any): any {
		if (typeof(data) === "number") {
			let num = data as number;
			if (num > Math.PI) {
				return num - Math.PI;
			} else {
				return num + Math.PI;
			}
		} else {
			let vector = data as Vector;
			return new Vector(-vector.x, -vector.y);
		}
	}
	toLocal (data: any): any {
		return this.toGlobal(data);
	}
	listToGlobal (data: any[]): any[] {
		let inverted = [];
		for (let v of data) {
			inverted.push(this.toGlobal(v));
		}
		return inverted;
	}
}

class Pass implements CoordinatesType {
	toGlobal(value: any): any {
		return value;
	}
	toLocal (value: any): any {
		return value;
	}
	listToGlobal (value: any): any {
		return value;
	}
}

export let Coordinates: CoordinatesType;

export function _setIsBlue (teamIsBlue: boolean) {
	if (teamIsBlue) {
		Coordinates = new Invert();
	} else {
		Coordinates = new Pass();
	}
}

