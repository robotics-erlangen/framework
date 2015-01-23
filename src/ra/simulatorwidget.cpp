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

#include "simulatorwidget.h"
#include "ui_simulatorwidget.h"
#include "protobuf/command.pb.h"

SimulatorWidget::SimulatorWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::SimulatorWidget),
    m_speed(1.0f),
    m_lastSpeed(1.0f)
{
    ui->setupUi(this);

    ui->btnStart->setIcon(QIcon("icon:32/media-playback-start.png"));
    ui->btnStop->setIcon(QIcon("icon:32/media-playback-stop.png"));

    connect(ui->spinSpeed, SIGNAL(valueChanged(int)), SLOT(setSpeed(int)));
    connect(ui->btnStart, SIGNAL(clicked()), SLOT(start()));
    connect(ui->btnStop, SIGNAL(clicked()), SLOT(stop()));

    connect(ui->spinStddevBall, SIGNAL(valueChanged(double)), SLOT(setStddevBall(double)));
    connect(ui->spinStddevRobotPos, SIGNAL(valueChanged(double)), SLOT(setStddevRobotPos(double)));
    connect(ui->spinStddevRobotPhi, SIGNAL(valueChanged(double)), SLOT(setStddevRobotPhi(double)));

    QAction *actionSpeedIncrease = new QAction(this);
    actionSpeedIncrease->setShortcut(QKeySequence("+"));
    connect(actionSpeedIncrease, SIGNAL(triggered()), SLOT(increaseSpeed()));
    addAction(actionSpeedIncrease);

    QAction *actionSpeedDecrease = new QAction(this);
    actionSpeedDecrease->setShortcut(QKeySequence("-"));
    connect(actionSpeedDecrease, SIGNAL(triggered()), SLOT(decreaseSpeed()));
    addAction(actionSpeedDecrease);
}

SimulatorWidget::~SimulatorWidget()
{
    delete ui;
}

void SimulatorWidget::setSpeed(int speed)
{
    m_lastSpeed = m_speed;
    m_speed = speed / 100.0f;
    emit speedChanged(m_speed);

    Command command(new amun::Command);
    command->set_speed(m_speed);
    emit sendCommand(command);
}

void SimulatorWidget::start()
{
    if (m_speed == 0.0f) {
        ui->spinSpeed->setValue(m_lastSpeed * 100.0f);
    } else {
        ui->spinSpeed->setValue(100);
    }
}

void SimulatorWidget::stop()
{
    ui->spinSpeed->setValue(0);
}

void SimulatorWidget::increaseSpeed()
{
    ui->spinSpeed->setValue(ui->spinSpeed->value() + 10);
}

void SimulatorWidget::decreaseSpeed()
{
    ui->spinSpeed->setValue(ui->spinSpeed->value() - 10);
}

void SimulatorWidget::setStddevBall(double stddev)
{
    Command command(new amun::Command);
    command->mutable_simulator()->set_stddev_ball_p(stddev);
    emit sendCommand(command);
}

void SimulatorWidget::setStddevRobotPos(double stddev)
{
    Command command(new amun::Command);
    command->mutable_simulator()->set_stddev_robot_p(stddev);
    emit sendCommand(command);
}

void SimulatorWidget::setStddevRobotPhi(double stddev)
{
    Command command(new amun::Command);
    command->mutable_simulator()->set_stddev_robot_phi(stddev);
    emit sendCommand(command);
}
