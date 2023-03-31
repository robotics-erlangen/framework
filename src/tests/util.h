/***************************************************************************
 *   Copyright 2023 Christoph Schmidtmeier                                 *
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
 ***************************************************************************/

#include "gtest/gtest.h"
#include "core/vector.h"

#define ASSERT_APPROX_EQ(x, y, rel_err, abs_err) ASSERT_PRED4(approxEq, x, y, rel_err, abs_err)

/* compares a and b
 *   - if their difference is below absoluteError, use absolute comparison
 *   - else relative
 */
static inline bool approxEq(const float x, const float y, const float relativeError, const float absoluteError) {
    auto difference = std::abs(x - y);
    auto sum = std::min((std::abs(x + y)), std::numeric_limits<float>::max());
    return difference < std::max(absoluteError, relativeError * sum);
}


#define ASSERT_VECTOR_APPROX_EQ(u, v, rel_err, abs_err) ASSERT_PRED4(vectorApproxEq, u, v, rel_err, abs_err)

static inline bool vectorApproxEq(const Vector u, const Vector v, const float relativeError, const float absoluteError) {
    return approxEq(u.x, v.x, relativeError, absoluteError) && approxEq(u.y, v.y, relativeError, absoluteError);
}
