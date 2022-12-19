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
import * as World from "base/world";


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
	let r, g, b: number;
	r = c;
	g = x;
	b = 0;
	if (hue * 6 > 1) {
		r = x;
		g = c;
		b = 0;
	}
	if (hue * 6 > 2) {
		r = 0;
		g = c;
		b = x;
	}
	if (hue * 6 > 3) {
		r = 0;
		g = x;
		b = c;
	}
	if (hue * 6 > 4) {
		r = x;
		g = 0;
		b = c;
	}
	if (hue * 6 > 5) {
		r = c;
		g = 0;
		b = x;
	}
	return fromRGBA((r + m) * 255, (g + m) * 255, (b + m) * 255, alpha);
}

type Style = pb.amun.Pen.Style;

/**
 * List of predefined colors.
 *
 * Normals colors have alpha = 255.
 * Colors ending with half have alpha = 127.
 */
export const colors = {
	black: fromRGBA(0, 0, 0, 255),
	blackHalf: fromRGBA(0, 0, 0, 127),
	white: fromRGBA(255, 255, 255, 255),
	whiteHalf: fromRGBA(255, 255, 255, 127),
	whiteQuarter: fromRGBA(255, 255, 255, 64),
	grey: fromRGBA(127, 127, 127, 255),
	greyHalf: fromRGBA(127, 127, 127, 127),

	red: fromRGBA(255, 0, 0, 255),
	redHalf: fromRGBA(255, 0, 0, 127),
	green: fromRGBA(0, 255, 0, 255),
	greenHalf: fromRGBA(0, 255, 0, 127),
	blue: fromRGBA(0, 0, 255, 255),
	blueHalf: fromRGBA(0, 0, 255, 127),

	yellow: fromRGBA(255, 255, 0, 255),
	yellowHalf: fromRGBA(255, 255, 0, 127),
	pink: fromRGBA(255, 0, 255, 255),
	pinkHalf: fromRGBA(255, 0, 255, 127),
	cyan: fromRGBA(0, 255, 255, 255),
	cyanHalf: fromRGBA(0, 255, 255, 127),

	orange: fromRGBA(255, 127, 0, 255),
	orangeHalf: fromRGBA(255, 127, 0, 127),
	magenta: fromRGBA(255, 0, 127, 255),
	magentaHalf: fromRGBA(255, 0, 127, 127),
	brown: fromRGBA(127, 63, 0, 255),
	brownHalf: fromRGBA(127, 63, 0, 127),
	skyBlue: fromRGBA(127, 191, 255, 255),
	skyBlueHalf: fromRGBA(127, 191, 255, 127),

	slate: fromRGBA(112, 118, 144, 255),
	slateHalf: fromRGBA(112, 118, 144, 127),
	orchid: fromRGBA(218, 94, 224, 255),
	orchidHalf: fromRGBA(218, 94, 224, 127),
	gold: fromRGBA(239, 185, 15, 255),
	goldHalf: fromRGBA(239, 185, 15, 127),
	mediumPurple: fromRGBA(171, 130, 255, 255),
	mediumPurpleHalf: fromRGBA(171, 130, 255, 127),
	darkPurple: fromRGBA(93, 71, 139, 255),
	darkPurpleHalf: fromRGBA(93, 71, 139, 127),
};

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
			circle: { p_x: center.x, p_y: center.y, radius: radius },
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
			polygon: { point: points },
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
const N_CORNERS = 25;
export function addPizza(name: string, center: Position, radius: number,
		startAngle: number, endAngle: number, color?: Color, isFilled?: boolean, background?: boolean, style?: Style) {
	let points = [center + Vector.fromPolar(startAngle, radius), center, center + Vector.fromPolar(endAngle, radius)];
	if ((startAngle - endAngle) % (2 * Math.PI) < 2 * Math.PI / N_CORNERS) {
		addPolygon(name, points, color, isFilled, background, style);
	} else {
		let wStart = Math.ceil(N_CORNERS * endAngle / (2 * Math.PI));
		let wEnd = Math.floor(N_CORNERS * startAngle / (2 * Math.PI));
		if (wEnd < wStart) {
			wEnd = wEnd + N_CORNERS;
		}
		for (let w = wStart; w < wEnd; w++) {
			let angle = w * Math.PI * 2 / N_CORNERS;
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
			path: { point: points },
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
			for (let i = 0; i < points.length; i++) {
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

export function addFieldVisualization(name: string, f: (pos: Vector) => Color, pixelWidth: number, pixelHeight: number,
		drawCornerTL?: Vector, drawCornerBR?: Vector) {

	if (!drawCornerTL) {
		drawCornerTL = new Vector(-World.Geometry.FieldWidthHalf - World.Geometry.BoundaryWidth,
			-World.Geometry.FieldHeightHalf - World.Geometry.BoundaryWidth);
	} else {
		drawCornerTL = Coordinates.toGlobal(drawCornerTL);
	}
	if (!drawCornerBR) {
		drawCornerBR = new Vector(World.Geometry.FieldWidthHalf + World.Geometry.BoundaryWidth,
			World.Geometry.FieldHeightHalf + World.Geometry.BoundaryWidth);
	} else {
		drawCornerBR = Coordinates.toGlobal(drawCornerBR);
	}
	let data = new Uint8Array(pixelWidth * pixelHeight * 4);
	const fieldSize = drawCornerBR - drawCornerTL;
	for (let y = 0; y < pixelHeight; y++) {
		for (let x = 0; x < pixelWidth; x++) {
			const pos = new Vector((x + 0.5) / pixelWidth * fieldSize.x,
									(y + 0.5) / pixelHeight * fieldSize.y) + drawCornerTL;
			const color = f(Coordinates.toLocal(pos));
			const baseIndex = (y * pixelWidth + x) * 4;
			data.set([color.blue, color.green, color.red, color.alpha], baseIndex);
		}
	}
	amunLocal.addVisualization({ name: name, image: {
		width: pixelWidth,
		height: pixelHeight,
		data: data,
		draw_area: {
			topleft: {
				x: drawCornerTL.x,
				y: drawCornerTL.y
			},
			bottomright: {
				x: drawCornerBR.x,
				y: drawCornerBR.y
			}
		}
	} } as any);
}
