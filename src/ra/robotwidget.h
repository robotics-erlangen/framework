/***************************************************************************
 *   Copyright 2014 Michael Bleier, Michael Eischer, Philipp Nordhus       *
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

#ifndef ROBOTWIDGET_H
#define ROBOTWIDGET_H

#include "protobuf/status.pb.h"
#include <QActionGroup>
#include <QLabel>
#include <QToolButton>
#include <QTimer>

class InputManager;

class RobotWidget : public QWidget
{
    Q_OBJECT

public:
    enum Team { NoTeam, Blue, Yellow, Mixed, PartialBlue, PartialYellow };

public:
    explicit RobotWidget(InputManager *inputManager, bool is_generation, QWidget *parent = 0);
    ~RobotWidget();

public:
    void setSpecs(const robot::Specs &specs);

signals:
    void addBinding(uint generation, uint id, const QString &device);
    void removeBinding(uint generation, uint id);
    void strategyControlled(uint generation, uint id, bool strategyControlled);
    void teamSelected(uint generation, uint id, RobotWidget::Team team);

public slots:
    void setTeam(uint generation, uint id, RobotWidget::Team team);
    void handleResponse(const robot::RadioResponse &response);
    void generationChanged(uint generation, RobotWidget::Team team);
    void hideRobotStatus();

private slots:
    void selectInput();
    void disableInput();
    void setStrategyControlled(bool isControlled);
    void updateMenu();
    void selectTeam(QAction *action);
    void selectTeam(Team team);

private:
    InputManager *m_inputManager;
    bool m_isGeneration;
    robot::Specs m_specs;
    QTimer *m_responseTimer;
    QLabel *m_label;
    QToolButton *m_btnControl;
    QMenu *m_menu;
    QString m_inputDevice;
    bool m_strategyControlled;
    QActionGroup *m_inputDeviceGroup;
    QLabel *m_inputLabel;
    QLabel *m_battery;
    QLabel *m_radio;
    QLabel *m_radioErrors;
    QLabel *m_ball;
    QLabel *m_motorWarning;
    QLabel *m_capCharged;
    QToolButton *m_team;
    QMenu *m_teamMenu;
    QActionGroup *m_teamGroup;
};

#endif // ROBOTWIDGET_H
