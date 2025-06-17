/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#include "goalselectionwidget.h"
#include "fieldwidget.h"
#include <QPainter>
#include <vector>

GoalSelectionWidget::GoalSelectionWidget(QWidget *parent) : QWidget(parent)
{
    for (int i = 0;i<12;i++) {
        m_goalSelectionButtons[i].setParent(this);
        m_buttonGroup.addButton(&m_goalSelectionButtons[i], i);
        connect(&m_goalSelectionButtons[i], SIGNAL(clicked()), this, SLOT(goalIdChanged()));
    }
}

void GoalSelectionWidget::goalIdChanged()
{
    emit goalIdChanged(m_buttonGroup.checkedId());
}

void GoalSelectionWidget::setActiveButton(int buttonId)
{
    m_goalSelectionButtons[buttonId].setChecked(true);
}

void GoalSelectionWidget::paintEvent(QPaintEvent *)
{
    QPainter painter(this);
    painter.setPen(Qt::white);
    painter.setBrush(Qt::white);

    QRectF rectf = rect();
    const auto scaling = std::min(rectf.width() / realGeom->field_width(), rectf.height() / realGeom->field_height());
    QTransform transform;
    transform.translate(rectf.center().x(), rectf.center().y());
    transform.rotate(-m_rotation);
    transform.scale(scaling, scaling);
    painter.setTransform(transform);

    const auto& realGeometry = *realGeom;
    const auto [geomRect, fieldRect] = FieldWidget::computeFieldAndGeomRect(realGeometry);
    FieldWidget::drawField(&painter, geomRect, fieldRect, realGeometry, 0.0, false);

    if (maybeVirtualFieldConfig.has_value()) {
        const auto virtualFieldTransform = maybeVirtualFieldConfig->transform;
        QTransform transform2 {
                            virtualFieldTransform[0],
                            virtualFieldTransform[1],
                            virtualFieldTransform[2],
                            virtualFieldTransform[3],
                            -virtualFieldTransform[4],
                            -virtualFieldTransform[5]
        };
        const auto prelimGeomTransform = transform2.inverted() * transform;
        painter.setTransform(prelimGeomTransform);

        const auto& virtualFieldGeom = maybeVirtualFieldConfig->geometry;
        const auto [geomRect, fieldRect] = FieldWidget::computeFieldAndGeomRect(virtualFieldGeom);
        FieldWidget::drawGeometry(&painter, virtualFieldGeom, virtualFieldGeom.field_height() * 0.5, geomRect, false, scaling);
    }

    const auto newFieldHeight = realGeom->field_height() * scaling;
    const auto newFieldWidth = realGeom->field_width() * scaling;
    const bool resizeHappened = newFieldHeight != fieldHeightInRect || newFieldWidth != fieldWidthInRect;
    fieldHeightInRect = newFieldHeight;
    fieldWidthInRect = newFieldWidth;
    // call resizeEvent to move buttons to correct location
    if (resizeHappened) {
        resizeEvent(nullptr);
    }
}

void GoalSelectionWidget::resizeEvent(QResizeEvent *)
{
    int buttonWidth = m_goalSelectionButtons[0].sizeHint().width();
    int buttonHeight = m_goalSelectionButtons[0].sizeHint().height();
    const QPointF center = rect().center() - QPointF{ fieldHeightInRect, fieldWidthInRect } * 0.5;
    for (int i = 0;i<12;i++) {
        int x = center.x() + m_buttonCoordinates[i][0] * fieldHeightInRect - buttonWidth / 2;
        int y = center.y() + m_buttonCoordinates[i][1] * fieldWidthInRect - buttonHeight / 2;
        x = std::max(1, std::min(width() - buttonWidth, x));
        y = std::max(1, std::min(height() - buttonHeight, y));
        m_goalSelectionButtons[i].move(x, y);
    }
}

std::array<float, 6> GoalSelectionWidget::fieldTransform(float visionWidth, float visionHeight, float virtualHeight)
{
    const std::vector<std::vector<float>> directions = {{0, 1}, {0, 1}, {0, 1}, {1, 0}, {1, 0}, {1, 0},
                                             {0, -1}, {0, -1}, {0, -1}, {-1, 0}, {-1, 0}, {-1, 0}};
    const std::vector<unsigned int> rotations = {1, 1, 1, 2, 2, 2, 3, 3, 3, 0, 0, 0};
    const std::vector<std::vector<int>> rotationMatrices = {{1, 0, 0, 1}, {0, 1, -1, 0}, {-1, 0, 0, -1}, {0, -1, 1, 0}};

    unsigned int radioButtonId = (unsigned int)m_buttonGroup.checkedId();
    std::array<float, 4> rotation;
    for (unsigned int i = 0;i<4;i++) {
        rotation[i] = rotationMatrices[rotations[radioButtonId]][i];
    }
    float realGoalPosX = visionWidth * (m_buttonCoordinates[radioButtonId][1] - 0.5f);
    float realGoalPosY = visionHeight * (m_buttonCoordinates[radioButtonId][0]- 0.5f);
    float virtualGoalPosY = virtualHeight * 0.5f;
    std::array<float, 6> result;

    QTransform cancelCurrentFieldRotation;
    cancelCurrentFieldRotation.rotate(m_rotation - 90);

    const float dx = -(rotation[0] * realGoalPosX + rotation[1] * realGoalPosY);
    const float dy = virtualGoalPosY - (rotation[2] * realGoalPosX + rotation[3] * realGoalPosY);
    QTransform translation = cancelCurrentFieldRotation * QTransform::fromTranslate(dx, dy);
    QTransform rotTransform{rotation[0], rotation[1], rotation[2], rotation[3], 0, 0};
    rotTransform = cancelCurrentFieldRotation * rotTransform;
    result[0] = rotTransform.m11();
    result[1] = rotTransform.m12();
    result[2] = rotTransform.m21();
    result[3] = rotTransform.m22();
    result[4] = translation.dx();
    result[5] = translation.dy();
    return result;
}
