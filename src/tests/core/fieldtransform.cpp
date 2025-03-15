/***************************************************************************
 *   Copyright 2025 Paul Bergmann                                          *
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

#include "core/fieldtransform.h"
#include "gtest/gtest.h"
#include <QPointF>

TEST(FieldTransform, ConstructorUniform) {
    FieldTransform t;

    ASSERT_EQ(t.applyPosX(1.0f, 2.0f), 1.0f);
    ASSERT_EQ(t.applyPosY(1.0f, 2.0f), 2.0f);
    ASSERT_EQ(t.applyPosition(QPointF(1.0f, 2.0f)), QPointF(1.0f, 2.0f));
    ASSERT_EQ(t.applySpeedX(1.0f, 2.0f), 1.0f);
    ASSERT_EQ(t.applySpeedY(1.0f, 2.0f), 2.0f);
    ASSERT_EQ(t.applyAngle(1.0f), 1.0f);
    ASSERT_EQ(t.applyInversePosX(1.0f, 2.0f), 1.0f);
    ASSERT_EQ(t.applyInversePosY(1.0f, 2.0f), 2.0f);
    ASSERT_EQ(t.applyInversePosition(QPointF(1.0f, 2.0f)), QPointF(1.0f, 2.0f));
    ASSERT_EQ(t.applyInverseSpeedX(1.0f, 2.0f), 1.0f);
    ASSERT_EQ(t.applyInverseSpeedY(1.0f, 2.0f), 2.0f);
}

TEST(FieldTransform, InversePositionInvariant) {
    FieldTransform t;

    t.setFlip(true);
    t.setTransform({ 2.0f, 3.0f, 4.0f, 5.0f, 6.0f, 7.0f });

    const QPointF a = t.applyInversePosition(t.applyPosition({ 1.0f, 2.0f }));
    EXPECT_FLOAT_EQ(a.x(), 1.0f);
    EXPECT_FLOAT_EQ(a.y(), 2.0f);

    const float base_p_x = 1.0f;
    const float base_p_y = 2.0f;

    const float transformed_x = t.applyPosX(base_p_x, base_p_y);
    const float transformed_y = t.applyPosY(base_p_x, base_p_y);

    const float inverse_x = t.applyInversePosX(transformed_x, transformed_y);
    const float invserse_y = t.applyInversePosY(transformed_x, transformed_y);

    EXPECT_FLOAT_EQ(inverse_x, base_p_x);
    EXPECT_FLOAT_EQ(invserse_y, base_p_y);
}

TEST(FieldTransform, InverseSpeedInvariant) {
    FieldTransform t;

    t.setFlip(true);
    t.setTransform({ 2.0f, 3.0f, 4.0f, 5.0f, 6.0f, 7.0f });

    const float base_v_x = 1.0f;
    const float base_v_y = 5.0f;

    const float transformed_v_x = t.applyPosX(base_v_x, base_v_y);
    const float transformed_v_y = t.applyPosY(base_v_x, base_v_y);

    const float inverse_v_x = t.applyInversePosX(transformed_v_x, transformed_v_y);
    const float invserse_v_y = t.applyInversePosY(transformed_v_x, transformed_v_y);

    EXPECT_FLOAT_EQ(inverse_v_x, base_v_x);
    EXPECT_FLOAT_EQ(invserse_v_y, base_v_y);
}
