--[[***********************************************************************
*   Copyright 2026 Robotics Erlangen e.V., Tobias Heineken                *
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
*************************************************************************]]

local Eigen = require "../base/eigen"

context("base.eigen", function ()
	test("dimesions", function ()
		local mat = Eigen(100, 7)
		local r, c = mat:size()
		assert_equal(r, 100)
		assert_equal(c, 7)
	end)

	test("outOfBounds", function()
		local mat = Eigen(100, 7)
		local function writeR()
			mat[105][5] = 4
		end
		local function writeC()
			mat[95][40] = 3
		end
		local function readR()
			return mat[105][3]
		end
		local function readC()
			return mat[95][40]
		end
		local function readOverdims()
			return mat[95][4][3]
		end
		local function writeOverdims()
			mat[95][4][3] = 3
		end

		assert_error(writeR)
		assert_error(writeC)
		assert_error(readR)
		assert_error(readC)
		assert_error(readOverdims)
		assert_error(writeOverdims)
	end)

	test("read-write", function()
		local mat = Eigen(100, 7)
		for i=1,5 do
			mat[i][i] = i
		end
		for i = 1,5 do
			assert_equal(mat[i][i], i)
		end
	end)

	test("rows", function()
		local mat = Eigen(100, 7)
		for i=1, 5 do
			local row = mat[i]
			for j=1, 7 do
				row[j] = 1;
			end
		end
		for i = 1,5 do
			for j=i, 7 do
				assert_equal(mat[i][j], 1)
			end
		end
	end)

	test("setrows", function()
		local mat = Eigen(100, 7);
		local row = mat[5];
		assert_error(function() mat[8] = row end)
	end)

	test("read-write-borders", function()
		local mat = Eigen(100, 7)
		mat[1][1] = 14
		mat[1][7] = 14
		mat[100][1] = 14
		mat[100][7] = 14
		assert_equal(mat[1][1], 14)
		assert_equal(mat[1][7], 14)
		assert_equal(mat[100][1], 14)
		assert_equal(mat[100][7], 14)
	end)

	test("oob-borders", function()
		local mat = Eigen(100, 7)
		assert_error(function() return mat[0][3] end)
		assert_error(function() mat[0][3] = 4 end)
		assert_error(function() return mat[3][0] end)
		assert_error(function() mat[3][0] = 4 end)
		assert_error(function() return mat[101][3] end)
		assert_error(function() mat[101][3] = 4 end)
		assert_error(function() return mat[3][8] end)
		assert_error(function() mat[3][8] = 4 end)
	end)

	test("transpose-quadratic", function()
		local mat = Eigen(5, 5)
		for i=1, 5 do
			for j=1, 5 do
				mat[i][j] = i + j * 100
			end
		end
		local transposed = mat:transposed()
		for i=1, 5 do
			for j=1, 5 do
				assert_equal(mat[i][j], i + j * 100)
				assert_equal(transposed[j][i], i + j * 100)
			end
		end
	end)

	test("transpose-rect", function()
		local mat = Eigen(5, 7)
		for i=1, 5 do
			for j=1, 7 do
				mat[i][j] = i + j * 100
			end
		end
		local transposed = mat:transposed()
		for i=1, 5 do
			for j=1, 7 do
				assert_equal(mat[i][j], i + j * 100)
				assert_equal(transposed[j][i], i + j * 100)
			end
		end
	end)

	test("matmul", function()
		local mat = Eigen(3, 3)
		-- use orthogonal matrix from https://www.cuemath.com/algebra/orthogonal-matrix/, multiplied by 3
		mat[1][1] = 1
		mat[1][2] = 2
		mat[1][3] = -2
		mat[2][1] = -2
		mat[2][2] = 2
		mat[2][3] = 1
		mat[3][1] = 2
		mat[3][2] = 1
		mat[3][3] = 2
		local transposed = mat:transposed()
		local function check_mult_res(res)

			assert_equal(mat[1][1], 1)
			assert_equal(transposed[1][1], 1)
			assert_equal(res[1][1], 9)

			assert_equal(mat[1][2], 2)
			assert_equal(transposed[2][1], 2)
			assert_equal(res[1][2], 0)

			assert_equal(mat[1][3], -2)
			assert_equal(transposed[3][1], -2)
			assert_equal(res[1][3], 0)

			assert_equal(mat[2][1], -2)
			assert_equal(transposed[1][2], -2)
			assert_equal(res[2][1], 0)

			assert_equal(mat[2][2], 2)
			assert_equal(transposed[2][2], 2)
			assert_equal(res[2][2], 9)

			assert_equal(mat[2][3], 1)
			assert_equal(transposed[3][2], 1)
			assert_equal(res[2][3], 0)

			assert_equal(mat[3][1], 2)
			assert_equal(transposed[1][3], 2)
			assert_equal(res[3][1], 0)

			assert_equal(mat[3][2], 1)
			assert_equal(transposed[2][3], 1)
			assert_equal(res[3][2], 0)

			assert_equal(mat[3][3], 2)
			assert_equal(transposed[3][3], 2)
			assert_equal(res[3][3], 9)
		end
		local res = mat * transposed;
		check_mult_res(res)
		res = transposed * mat
		check_mult_res(res)
	end)

	test("matmul-invalid", function()
		local mat = Eigen(3, 3)
		local mat2 = Eigen(4, 4)
		assert_error(function() return mat * mat2 end)
	end)
	test("scale-rect",
		(function()
		local mat = Eigen(5, 7)
		local scale = Eigen(7, 7)
		for i=1, 5 do
			for j=1, 7 do
				mat[i][j] = i + j * 100
			end
		end
		for i=1, 7 do
			for j=1, 7 do
				scale[i][j] = (i == j) and 2 or 0
			end
		end
		local res = mat * scale
		local r, c = res:size()
		assert_equal(r, 5)
		assert_equal(c, 7)
		for i=1, 5 do
			for j=1, 7 do
				assert_equal(res[i][j], (i + j * 100) * 2)
			end
		end
	end))

	test("solve",
		function()
		-- example taken from https://eigen.tuxfamily.org/dox/group__TutorialLinearAlgebra.html
		local A = Eigen(2, 2)
		local b = Eigen(2, 2)
		A[1][1] = 2
		A[1][2] = -1
		A[2][1] = -1
		A[2][2] = 3

		b[1][1] = 1;
		b[1][2] = 2;
		b[2][1] = 3;
		b[2][2] = 1;

		local res = A:solve(b);
		assert_equal(A[1][1], 2)
		assert_equal(A[1][2], -1)
		assert_equal(A[2][1], -1)
		assert_equal(A[2][2], 3)

		assert_equal(b[1][1], 1)
		assert_equal(b[1][2], 2)
		assert_equal(b[2][1], 3)
		assert_equal(b[2][2], 1)

		assert_equal_eps(res[1][1], 1.2, 1e-5)
		assert_equal_eps(res[1][2], 1.4, 1e-5)
		assert_equal_eps(res[2][1], 1.4, 1e-5)
		assert_equal_eps(res[2][2], 0.8, 1e-5)
	end)
end)
