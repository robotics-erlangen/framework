/***************************************************************************
 *   Copyright 2015 Philipp Nordhus                                        *
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

#ifndef SIMULATORWIDGET_H
#define SIMULATORWIDGET_H

#include "protobuf/command.h"
#include "protobuf/status.h"
#include <QWidget>

namespace Ui {
    class SimulatorWidget;
}

class SimulatorWidget : public QWidget
{
    Q_OBJECT

public:
    explicit SimulatorWidget(QWidget *parent = 0);
    ~SimulatorWidget() override;
    SimulatorWidget(const SimulatorWidget&) = delete;
    SimulatorWidget& operator=(const SimulatorWidget&) = delete;
    void sendPauseSimulator(amun::PauseSimulatorReason reason, bool pause);

signals:
    void sendCommand(const Command &command);

public slots:
    void handleStatus(const Status &status);
    void stop();
    void start();

private slots:
    void setEnableAutoPause(bool autoPause);
    void handleAppState(Qt::ApplicationState state);
    void setSpeed(int speed);
    void increaseSpeed();
    void decreaseSpeed();
    void setEnableNoise(int state);
    void setStddevBall(double stddev);
    void setStddevRobotPos(double stddev);
    void setStddevRobotPhi(double stddev);

    void on_btnToggle_clicked();

private:
    Ui::SimulatorWidget *ui;
    bool m_enableAutoPause;
    bool m_paused;
};

#endif // SIMULATORWIDGET_H
