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
#include <QPainter>
#include <vector>

GoalSelectionWidget::GoalSelectionWidget(QWidget *parent) : QWidget(parent)
{
    for (int i = 0;i<12;i++) {
        m_goalSelectionButtons[i].setParent(this);
        m_buttonGroup.addButton(&m_goalSelectionButtons[i], i);
    }
}

void GoalSelectionWidget::setActiveButton(int buttonId)
{
    m_goalSelectionButtons[buttonId].setChecked(true);
}

void GoalSelectionWidget::paintEvent(QPaintEvent *)
{
    QPainter painter(this);
    painter.setPen(Qt::black);
    painter.setBrush(Qt::white);

    painter.drawRect(QRect(0, 0, width() - 1, height() - 1));
    painter.drawLine(width() / 2, 0, width() / 2, height());
}

void GoalSelectionWidget::resizeEvent(QResizeEvent *)
{
    int buttonWidth = m_goalSelectionButtons[0].sizeHint().width();
    int buttonHeight = m_goalSelectionButtons[0].sizeHint().height();
    for (int i = 0;i<12;i++) {
        int x = m_buttonCoordinates[i][0] * width() - buttonWidth / 2;
        int y = m_buttonCoordinates[i][1] * height() - buttonHeight / 2;
        x = std::max(1, std::min(width() - buttonWidth, x));
        y = std::max(1, std::min(height() - buttonHeight, y));
        m_goalSelectionButtons[i].move(x, y);
    }
}

std::array<float, 6> GoalSelectionWidget::fieldTransform(float visionWidth, float visionHeight, float virtualHeight)
{
    const std::vector<std::vector<float>> directions = {{0, 1}, {0, 1}, {0, 1}, {1, 0}, {1, 0}, {1, 0},
                                             {0, -1}, {0, -1}, {0, -1}, {-1, 0}, {-1, 0}, {-1, 0}};
    const std::vector<int> rotations = {1, 1, 1, 2, 2, 2, 3, 3, 3, 0, 0, 0};
    const std::vector<std::vector<int>> rotationMatrices = {{1, 0, 0, 1}, {0, 1, 1, 0}, {-1, 0, 0, 1}, {1, 0, 0, -1}};

    int radioButtonId = m_buttonGroup.checkedId();
    std::array<float, 6> result;
    for (int i = 0;i<4;i++) {
        result[i] = rotationMatrices[rotations[radioButtonId]][i];
    }
    float realGoalPosX = visionWidth * m_buttonCoordinates[radioButtonId][1] - visionWidth / 2.0f;
    float realGoalPosY = visionHeight * m_buttonCoordinates[radioButtonId][0] - visionHeight / 2.0f;
    float virtualGoalPosY = -virtualHeight / 2.0f;
    result[4] = realGoalPosX;
    result[5] = realGoalPosY - virtualGoalPosY;
    return result;
}
