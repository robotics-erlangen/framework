export type Option = {
	padValue?: number
};

export type Matrix = number[][];

export function computeMunkres(cost_matrix: Matrix, options?: Option): Matrix;
