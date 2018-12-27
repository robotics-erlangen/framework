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

#ifndef GOALSELECTIONWIDGET_H
#define GOALSELECTIONWIDGET_H

#include <QWidget>
#include <QRadioButton>
#include <QButtonGroup>
#include <array>

class GoalSelectionWidget : public QWidget
{
    Q_OBJECT
public:
    explicit GoalSelectionWidget(QWidget *parent = nullptr);
    std::array<float, 6> fieldTransform(float visionWidth, float visionHeight, float virtualHeight);
    void setActiveButton(int buttonId);
    int goalId() const { return m_buttonGroup.checkedId(); }
    bool isSelectionRealGoal() const { return m_buttonGroup.checkedId() == 4 || m_buttonGroup.checkedId() == 10; }

signals:
    void goalIdChanged(int id);

private slots:
    void goalIdChanged();

protected:
    void paintEvent(QPaintEvent *);
    void resizeEvent(QResizeEvent *);

private:
    QRadioButton m_goalSelectionButtons[12];
    QButtonGroup m_buttonGroup;
    const std::vector<std::vector<float>> m_buttonCoordinates = {{0.25f, 0.f}, {0.5f, 0.f}, {0.75f, 0.f},
                                                                 {0.f, 0.25f}, {0.f, 0.5f}, {0.f, 0.75f},
                                                                 {0.25f, 1.f}, {0.5f, 1.f}, {0.75f, 1.f},
                                                                 {1.f, 0.25f}, {1.f, 0.5f}, {1.f, 0.75f}};
};

#endif // GOALSELECTIONWIDGET_H
