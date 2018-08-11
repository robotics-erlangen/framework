/*
/// Provides functions to draw on the game field
module "vis"
*/

/**************************************************************************
*   Copyright 2018 Florian Bauer, Michael Eischer, Christian Lobmeier,    *
*       Philipp Nordhus, Andreas Wendler                                  *
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
declare var amun: any;
let amunLocal = amun;

import {Coordinates} from "../base/coordinates";
import {Vector, Position} from "../base/vector";


export class Color {
	public readonly red: number;
	public readonly green: number;
	public readonly blue: number;
	public readonly alpha: number;

	constructor(r: number, g: number, b: number, a: number) {
		this.red = r, this.green = g, this.blue = b, this.alpha = a;
	}

	setAlpha(a: number) {
		return new Color(this.red, this.green, this.blue, a);
	}
}

let gcolor: Color;
let gisFilled: boolean = true;

/// Joins rgba-value to a color.
// Values from 0 to 255
// @name fromRGBA
// @param red number
// @param green number
// @param blue number
// @param alpha number
// @return table color
export function fromRGBA (red: number, green: number, blue: number, alpha: number): Color {
	return new Color(red, green, blue, alpha);
}

/// Implements a red-yellow-green gradient
// @name fromTemperature
// @param value a normalized temperature [0, 1]
// @param alpha the alpha value, default is 127
// @return table color
export function fromTemperature (value: number, alpha: number = 127): Color {
	if (value < 0) {
		throw "vis temperature too low: " + value;
	}
	if (value > 1) {
		throw "vis temperature too high: " + value;
	}
	let red = 1;
	let green = 1;
	if (value < 0.5) {
		red = 2 * value;
	} else {
		green = 2 - 2 * value;
	}
	return new Color(255 * red, 255 * green, 0, alpha);
}

export enum Style {
	DashLine = "DashLine",
	DotLine = "DotLine",
	DashDotLine = "DashDotLine",
	DashDotDotLine = "DashDotDotLine"
}

/// List of predefined colors.
// with alpha = 255. Colors ending with half have alpha = 127.
// @class table
// @name colors
// @field black (0,0,0)
// @field white (255,255,255)
// @field red (255,0,0)
// @field green (0,255,0)
// @field blue (0,0,255)
// @field yellow (255,255,0)
// @field pink (255,0,255)
// @field turquoise (0,255,255)
// @field orange (255, 127, 0)
// @field magenta (255, 0, 127)
// @field brown (127, 63, 0)
// @field skyBlue (127, 191, 255)

// @field blackHalf (0,0,0)
// @field whiteHalf (255,255,255)
// @field redHalf (255,0,0)
// @field greenHalf (0,255,0)
// @field blueHalf (0,0,255)
// @field yellowHalf (255,255,0)
// @field pinkHalf (255,0,255)
// @field turquoiseHalf (0,255,255)
// @field orangeHalf (255, 127, 0)
// @field magentaHalf (255, 0, 127)
// @field brownHalf (127, 63, 0)
// @field skyBlueHalf (127, 191, 255)

export let colors: {[name: string]: Color} = {};

colors.black = fromRGBA(0, 0, 0, 255);
colors.blackHalf = fromRGBA(0, 0, 0, 127);
colors.white = fromRGBA(255, 255, 255, 255);
colors.whiteHalf = fromRGBA(255, 255, 255, 127);
colors.grey = fromRGBA(127, 127, 127, 255);
colors.greyHalf = fromRGBA(127, 127, 127, 127);

colors.red = fromRGBA(255, 0, 0, 255);
colors.redHalf = fromRGBA(255, 0, 0, 127);
colors.green = fromRGBA(0, 255, 0, 255);
colors.greenHalf = fromRGBA(0, 255, 0, 127);
colors.blue = fromRGBA(0, 0, 255, 255);
colors.blueHalf = fromRGBA(0, 0, 255, 127);

colors.yellow = fromRGBA(255, 255, 0, 255);
colors.yellowHalf = fromRGBA(255, 255, 0, 127);
colors.pink = fromRGBA(255, 0, 255, 255);
colors.pinkHalf = fromRGBA(255, 0, 255, 127);
colors.turquoise = fromRGBA(0, 255, 255, 255);
colors.turquoiseHalf = fromRGBA(0, 255, 255, 127);

colors.orange = fromRGBA(255, 127, 0, 255);
colors.orangeHalf = fromRGBA(255, 127, 0, 127);
colors.magenta = fromRGBA(255, 0, 127, 255);
colors.magentaHalf = fromRGBA(255, 0, 127, 127);
colors.brown = fromRGBA(127, 63, 0, 255);
colors.brownHalf = fromRGBA(127, 63, 0, 127);
colors.skyBlue = fromRGBA(127, 191, 255, 255);
colors.skyBlueHalf = fromRGBA(127, 191, 255, 127);

colors.slate = fromRGBA(112, 118, 144, 255);
colors.slateHalf = fromRGBA(112, 118, 144, 127);
colors.orchid = fromRGBA(218, 94, 224, 255);
colors.orchidHalf = fromRGBA(218, 94, 224, 127);
colors.gold = fromRGBA(239, 185, 15, 255);
colors.goldHalf = fromRGBA(239, 185, 15, 127);
colors.mediumPurple = fromRGBA(171, 130, 255, 255);
colors.mediumPurpleHalf = fromRGBA(171, 130, 255, 127);
colors.darkPurple = fromRGBA(93, 71, 139, 255);
colors.darkPurpleHalf = fromRGBA(93, 71, 139, 127);


/// Sets line and fill color.
// If filled is true polygons and circles are filled using color.
// @name setColor
// @param color table
// @param isFilled bool
export function setColor (color: Color, isFilled: boolean) {
	gcolor = color;
	gisFilled = isFilled;
}

/// Adds a circle.
// If color is given use it instead of the global color and use the passed isFilled.
// @name addCircle
// @param name string - Visualization group
// @param center Vector - center of the circle
// @param radius number - radius of the circle
// @param color table - color (optional)
// @param isFilled bool - fill circle (optional)
export function addCircle (name: string, center: Position, radius: number, color?: Color,
		isFilled?: boolean, background?: boolean, style?: Style, lineWidth?: number) {
	addCircleRaw(name, Coordinates.toGlobal(center), radius, color, isFilled, background, style, lineWidth);
}

/// Adds a circle. Requires global coordinates.
// @name addCircleRaw
// @see addCircle
export function addCircleRaw (name: string, center: Position, radius: number, color?: Color,
		isFilled?: boolean, background?: boolean, style?: Style, lineWidth: number = 0.01) {
	// if color is set use passed isFilled
	if (color == undefined) {
		isFilled = gisFilled;
		color = gcolor;
	}
	let brush: Color | undefined;
	if (isFilled) {
		brush = color;
	}
	let t: any = {
		name: name, pen: { color: color, style: style },
		brush: brush, width: lineWidth,
		circle: {p_x: center.x, p_y: center.y, radius: radius},
		background: background
	};
	amunLocal.addVisualization(t);
}

/// Adds a polygon.
// If color is given use it instead of the global color and use the passed isFilled.
// @name addPolygon
// @param name string - Visualization group
// @param points Vector[] - Points of the polygon
// @param color table - color (optional)
// @param isFilled bool - fill circle (optional)
export function addPolygon (name: string, points: Position[], color?: Color,
		isFilled?: boolean, background?: boolean, style?: Style) {
	addPolygonRaw(name, Coordinates.listToGlobal(points), color, isFilled, background, style);
}

/// Adds a polygon. Requires global coordinates.
// @name addPolygonRaw
// @see addPolygon
export function addPolygonRaw (name: string, points: Position[], color?: Color,
		isFilled?: boolean, background?: boolean, style?: Style) {
	// if color is set use passed isFilled
	if (color == undefined) {
		isFilled = gisFilled;
		color = gcolor;
	}
	let brush: Color | undefined;
	if (isFilled) {
		brush = color;
	}
	amunLocal.addVisualization({
		name: name, pen: { color:color, style:style },
		brush: brush, width: 0.01,
		polygon: {point: points},
		background: background
	});
}


//Paints an axis aligned rectangle
//@name addAxisAlignedRectangle
//@param name string - Visualization group
//@param corner1 Vector - One corner of the rectangle
//@param corner2 Vector - The other corner of the rectangle
//@param color table - see @addPolygon
//@param isFilled bool - see @addPolygon
//@param background - see @addPolygon
//@param style - see @addPolygon
export function addAxisAlignedRectangle (name: string, corner1: Position, corner2: Position,
		color?: Color, isFilled?: boolean, background?: boolean, style?: Style) {
	let minX, minY, maxX, maxY
	minX = Math.min(corner1.x, corner2.x);
	minY = Math.min(corner1.y, corner2.y);
	maxX = Math.max(corner1.x, corner2.x);
	maxY = Math.max(corner1.y, corner2.y);
	let path: Position[] = [];
	path[0] = new Vector(minX, minY);
	path[1] = new Vector(minX, maxY);
	path[2] = new Vector(maxX, maxY);
	path[3] = new Vector(maxX, minY);
	addPolygon(name, path, color, isFilled, background, style);
}

/// Paints a Pizza where everything outside of [startAngle, endAngle] is filled
/// The shape of the pizza is approximated by a regular hexagon
// @param name string - Name of the pizza
// @param center Vectos - center point of the pizza
// @param radius number - radius of the pizza
// @param startAngle number - the starting angle of the missing pizza piece
// @param endAngle number - the end angle of the missing pizza piece
let N_corners = 25;
export function addPizza (name: string, center: Position, radius: number,
		startAngle: number, endAngle: number, color?: Color, isFilled?: boolean, background?: boolean, style?: Style) {
	let points = [center + Vector.fromAngle(startAngle)*radius, center, center + Vector.fromAngle(endAngle)*radius];
	if ((startAngle - endAngle)%(2*Math.PI) < 2*Math.PI/N_corners) {
		addPolygon(name, points, color, isFilled, background, style);
	} else {
		let wStart = Math.ceil(N_corners*endAngle/(2*Math.PI));
		let wEnd = Math.floor(N_corners*startAngle/(2*Math.PI));
		if (wEnd < wStart) {
			wEnd = wEnd + N_corners;
		}
		for (let w = wStart; w<wEnd; w++) {
			let angle = w*Math.PI*2/N_corners;
			points.push(center + Vector.fromAngle(angle)*radius);
		}
		addPolygon(name, points, color, isFilled, background, style);
	}
}

/// Adds a path.
// If color is given use it instead of the global color and use the passed isFilled.
// @name addPath
// @param name string - Visualization group
// @param points Vector[] - Points of the path
// @param color table - line color (optional)
export function addPath (name: string, points: Position[], color?: Color, background?: boolean, style?: Style, lineWidth?: number) {
	addPathRaw(name, Coordinates.listToGlobal(points), color, background, style, lineWidth);
}

/// Adds a path. Requires global coordinates.
// @name addPathRaw
// @see addPath
export function addPathRaw (name: string, points: Position[], color: Color = gcolor, background?: boolean,
		style?: Style, lineWidth: number = 0.01) {
	amunLocal.addVisualization({
		name: name, pen: { color:color, style:style },
		width: lineWidth,
		path: {point: points},
		background: background
	});
}
