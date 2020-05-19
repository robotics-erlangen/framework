/**
 * @module vis
 * Provides functions to draw on the game field
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
let amunLocal = amun;

import { Coordinates } from "base/coordinates";
import * as pb from "base/protobuf";
import { Position, Vector } from "base/vector";


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

/**
 * Joins rgba-value to a color.
 * Values from 0 to 255
 */
export function fromRGBA(red: number, green: number, blue: number, alpha: number): Color {
	return new Color(red, green, blue, alpha);
}

/**
 * Implements a red-yellow-green gradient
 * @param value - a normalized temperature [0, 1]
 * @param alpha - the alpha value, default is 127
 */
export function fromTemperature(value: number, alpha: number = 127): Color {
	if (value < 0) {
		throw new Error(`vis temperature too low: ${value}`);
	}
	if (value > 1) {
		throw new Error(`vis temperature too high: ${value}`);
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

/**
 * Joins rgba-value to a color.
 * Values from 0 to 1
 */
export function fromHSVA(hue: number, saturation: number, value: number, alpha: number = 127): Color {
	let c = value * saturation;
	let x = c * (1 - Math.abs((hue * 6) % 2 - 1));
	let m = value - c;
	let r_, g_, b_ : number;
	r_ = c;
	g_ = x;
	b_ = 0;
	if (hue * 6 > 1) {
		r_ = x;
		g_ = c;
		b_ = 0;
	}
	if (hue * 6 > 2) {
		r_ = 0;
		g_ = c;
		b_ = x;
	}
	if (hue * 6 > 3) {
		r_ = 0;
		g_ = x;
		b_ = c;
	}
	if (hue * 6 > 4) {
		r_ = x;
		g_ = 0;
		b_ = c;
	}
	if (hue * 6 > 5) {
		r_ = c;
		g_ = 0;
		b_ = x;
	}
	return fromRGBA((r_ + m) * 255, (g_ + m) * 255, (b_ + m) * 255, alpha);
}

type Style = pb.amun.Pen.Style;

/**
 * List of predefined colors.
 * with alpha = 255. Colors ending with half have alpha = 127.
 * - black (0,0,0)
 * - white (255,255,255)
 * - red (255,0,0)
 * - green (0,255,0)
 * - blue (0,0,255)
 * - yellow (255,255,0)
 * - pink (255,0,255)
 * - turquoise (0,255,255)
 * - orange (255, 127, 0)
 * - magenta (255, 0, 127)
 * - brown (127, 63, 0)
 * - skyBlue (127, 191, 255)
 *
 * - blackHalf (0,0,0)
 * - whiteHalf (255,255,255)
 * - redHalf (255,0,0)
 * - greenHalf (0,255,0)
 * - blueHalf (0,0,255)
 * - yellowHalf (255,255,0)
 * - pinkHalf (255,0,255)
 * - turquoiseHalf (0,255,255)
 * - orangeHalf (255, 127, 0)
 * - magentaHalf (255, 0, 127)
 * - brownHalf (127, 63, 0)
 * - skyBlueHalf (127, 191, 255)
 */

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

let gcolor: Color = colors.black;
let gisFilled: boolean = true;

/**
 * Sets line and fill color.
 * If filled is true polygons and circles are filled using color.
 */
export function setColor(color: Color, isFilled: boolean) {
	gcolor = color;
	gisFilled = isFilled;
}

/**
 * Adds a circle.
 * If color is given use it instead of the global color and use the passed isFilled.
 * @param name - Visualization group
 * @param center - center of the circle
 * @param radius - radius of the circle
 * @param color - color (optional)
 * @param isFilled - fill circle (optional)
 */
export function addCircle(name: string, center: Position, radius: number, color?: Color,
		isFilled?: boolean, background?: boolean, style?: Style, lineWidth?: number) {
	addCircleRaw(name, Coordinates.toGlobal(center), radius, color, isFilled, background, style, lineWidth);
}

/**
 * Adds a circle. Requires global coordinates.
 * @see addCircle
 */
export function addCircleRaw(name: string, center: Position, radius: number, color?: Color,
		isFilled: boolean = false, background: boolean = false, style?: Style, lineWidth: number = 0.01) {
	// if color is set use passed isFilled
	if (color == undefined) {
		isFilled = gisFilled;
		color = gcolor;
	}
	if (style != undefined) {
		// style is not supported by the fast specialized version
		let brush: Color | undefined;
		if (isFilled) {
			brush = color;
		}
		let t: pb.amun.Visualization = {
			name: name, pen: { color: color, style: style },
			brush: brush, width: lineWidth,
			circle: {p_x: center.x, p_y: center.y, radius: radius},
			background: background
		};
		amunLocal.addVisualization(t);
	} else {
		amunLocal.addCircleSimple(name, center.x, center.y, radius, color.red,
			color.green, color.blue, color.alpha, isFilled, background, lineWidth);
	}
}

/**
 * Adds a polygon.
 * If color is given use it instead of the global color and use the passed isFilled.
 * @param name - Visualization group
 * @param points - Points of the polygon
 * @param color - color (optional)
 * @param isFilled - fill circle (optional)
 */
export function addPolygon(name: string, points: Position[], color?: Color,
		isFilled?: boolean, background?: boolean, style?: Style) {
	addPolygonRaw(name, Coordinates.listToGlobal(points), color, isFilled, background, style);
}

/**
 * Adds a polygon. Requires global coordinates.
 * @see addPolygon
 */
export function addPolygonRaw(name: string, points: Position[], color?: Color,
		isFilled: boolean = false, background: boolean = false, style?: Style) {
	// if color is set use passed isFilled
	if (color == undefined) {
		isFilled = gisFilled;
		color = gcolor;
	}
	if (style != undefined) {
		let brush: Color | undefined;
		if (isFilled) {
			brush = color;
		}
		amunLocal.addVisualization({
			name: name, pen: { color: color, style: style },
			brush: brush, width: 0.01,
			polygon: {point: points},
			background: background
		});
	} else {
		let pointArray: number[] = [];
		for (let pos of points) {
			pointArray.push(pos.x);
			pointArray.push(pos.y);
		}
		amunLocal.addPolygonSimple(name, color.red, color.green, color.blue, color.alpha,
			isFilled, background, pointArray);
	}
}


/**
 * Paints an axis aligned rectangle
 * @name addAxisAlignedRectangle
 * @param name - Visualization group
 * @param corner1 - One corner of the rectangle
 * @param corner2 - The other corner of the rectangle
 * @param color - see @addPolygon
 * @param isFilled - see @addPolygon
 * @param background - see @addPolygon
 * @param style - see @addPolygon
 */
export function addAxisAlignedRectangle(name: string, corner1: Position, corner2: Position,
		color?: Color, isFilled?: boolean, background?: boolean, style?: Style) {
	let minX, minY, maxX, maxY;
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

/**
 * Paints a Pizza where everything outside of [startAngle, endAngle] is filled
 * The shape of the pizza is approximated by a regular hexagon
 * @param name - the pizza
 * @param center - center point of the pizza
 * @param radius - radius of the pizza
 * @param startAngle - the starting angle of the missing pizza piece
 * @param endAngle - the end angle of the missing pizza piece
 */
let N_corners = 25;
export function addPizza(name: string, center: Position, radius: number,
		startAngle: number, endAngle: number, color?: Color, isFilled?: boolean, background?: boolean, style?: Style) {
	let points = [center + Vector.fromPolar(startAngle, radius), center, center + Vector.fromPolar(endAngle, radius)];
	if ((startAngle - endAngle) % (2 * Math.PI) < 2 * Math.PI / N_corners) {
		addPolygon(name, points, color, isFilled, background, style);
	} else {
		let wStart = Math.ceil(N_corners * endAngle / (2 * Math.PI));
		let wEnd = Math.floor(N_corners * startAngle / (2 * Math.PI));
		if (wEnd < wStart) {
			wEnd = wEnd + N_corners;
		}
		for (let w = wStart; w < wEnd; w++) {
			let angle = w * Math.PI * 2 / N_corners;
			points.push(center + Vector.fromPolar(angle, radius));
		}
		addPolygon(name, points, color, isFilled, background, style);
	}
}

/**
 * Adds a path.
 * If color is given use it instead of the global color and use the passed isFilled.
 * @param name - Visualization group
 * @param points - Points of the path
 * @param color - line color (optional)
 */
export function addPath(name: string, points: Position[], color?: Color, background?: boolean, style?: Style, lineWidth?: number) {
	addPathRaw(name, Coordinates.listToGlobal(points), color, background, style, lineWidth);
}

/**
 * Adds a path. Requires global coordinates.
 * @see addPath
 */
export function addPathRaw(name: string, points: Position[], color: Color = gcolor, background: boolean = false,
		style?: Style, lineWidth: number = 0.01) {
	if (style != undefined) {
		amunLocal.addVisualization({
			name: name, pen: { color: color, style: style },
			width: lineWidth,
			path: {point: points},
			background: background
		});
	} else {
		if (amun.SUPPORTS_EFFICIENT_PATHVIS) {
			let allData = new Float32Array(6 + 2 * points.length);
			allData[0] = color.red;
			allData[1] = color.green;
			allData[2] = color.blue;
			allData[3] = color.alpha;
			allData[4] = lineWidth;
			allData[5] = background ? 1 : 0;
			for (let i = 0;i < points.length;i++) {
				allData[6 + i * 2] = points[i].x;
				allData[6 + i * 2 + 1] = points[i].y;
			}
			amunLocal.addPathSimple(name, allData);
		} else {
			let pointArray: number[] = [];
			for (let pos of points) {
				pointArray.push(pos.x);
				pointArray.push(pos.y);
			}
			amunLocal.addPathSimple(name, color.red, color.green, color.blue, color.alpha, lineWidth, background, pointArray);
		}
	}
}

