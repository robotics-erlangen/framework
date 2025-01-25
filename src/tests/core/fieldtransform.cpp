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
    ASSERT_EQ(t.applyInverseX(1.0f, 2.0f), 1.0f);
    ASSERT_EQ(t.applyInverseY(1.0f, 2.0f), 2.0f);
    ASSERT_EQ(t.applyInversePosition(QPointF(1.0f, 2.0f)), QPointF(1.0f, 2.0f));
}
