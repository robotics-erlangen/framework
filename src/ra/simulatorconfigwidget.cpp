/***************************************************************************
 *   Copyright 2020 Philipp Nordhus, Andreas Wendler                       *
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

#include "simulatorconfigwidget.h"
#include "ui_simulatorconfigwidget.h"
#include "protobuf/command.pb.h"
#include <QCheckBox>
#include <QDoubleSpinBox>
#include <QAction>

SimulatorConfigWidget::SimulatorConfigWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::SimulatorConfigWidget)
{
    ui->setupUi(this);

    connect(ui->chkEnableNoise, &QCheckBox::stateChanged, this, &SimulatorConfigWidget::sendSimulatorNoiseConfig);
    connect(ui->chkEnableInvisibleBall, &QCheckBox::stateChanged, this, &SimulatorConfigWidget::setEnableInvisibleBall);
    connect(ui->chkEnableInvisibleBall, &QCheckBox::toggled, ui->spinBallVisibilityThreshold, &QSpinBox::setEnabled);
    connect(ui->chkEnableInvisibleBall, &QCheckBox::toggled, ui->ballVisibilityThresholdLabel, &QSpinBox::setEnabled);
    connect(ui->spinBallVisibilityThreshold, SIGNAL(valueChanged(int)), SLOT(setBallVisibilityThreshold(int)));
    connect(ui->spinCameraOverlap, SIGNAL(valueChanged(int)), SLOT(setCameraOverlap(int)));

    connect(ui->spinStddevBall, SIGNAL(valueChanged(double)), SLOT(sendSimulatorNoiseConfig()));
    connect(ui->spinStddevRobotPos, SIGNAL(valueChanged(double)), SLOT(sendSimulatorNoiseConfig()));
    connect(ui->spinStddevRobotPhi, SIGNAL(valueChanged(double)), SLOT(sendSimulatorNoiseConfig()));
    connect(ui->spinStdDevBallArea, SIGNAL(valueChanged(double)), SLOT(sendSimulatorNoiseConfig()));
    connect(ui->spinDribblerBallDetections, SIGNAL(valueChanged(double)), SLOT(sendSimulatorNoiseConfig()));

    connect(ui->enableWorstCaseVision, &QCheckBox::toggled, this, &SimulatorConfigWidget::updateWorstCaseVision);
    connect(ui->worstCaseBallDetections, SIGNAL(valueChanged(double)), this, SLOT(updateWorstCaseVision()));
    connect(ui->worstCaseRobotDetections, SIGNAL(valueChanged(double)), this, SLOT(updateWorstCaseVision()));
}

SimulatorConfigWidget::~SimulatorConfigWidget()
{
    delete ui;
}

void SimulatorConfigWidget::sendSimulatorNoiseConfig()
{
    bool isEnabled = ui->chkEnableNoise->checkState() != Qt::Unchecked;

    Command command(new amun::Command);
    auto sim = command->mutable_simulator();
    sim->set_stddev_ball_p(isEnabled ? ui->spinStddevBall->value() : 0);
    sim->set_stddev_robot_p(isEnabled ? ui->spinStddevRobotPos->value() : 0);
    sim->set_stddev_robot_phi(isEnabled ? ui->spinStddevRobotPhi->value(): 0);
    sim->set_stddev_ball_area(isEnabled ? ui->spinStdDevBallArea->value(): 0);
    sim->set_dribbler_ball_detections(isEnabled ? ui->spinDribblerBallDetections->value() : 0);
    emit sendCommand(command);
}

void SimulatorConfigWidget::setEnableInvisibleBall(int state)
{
    bool isEnabled = state != Qt::Unchecked;

    Command command(new amun::Command);
    command->mutable_simulator()->set_enable_invisible_ball(isEnabled);
    emit sendCommand(command);
}

void SimulatorConfigWidget::setBallVisibilityThreshold(int threshold)
{
    Command command(new amun::Command);
    command->mutable_simulator()->set_ball_visibility_threshold(threshold / 100.0f);
    emit sendCommand(command);
}

void SimulatorConfigWidget::setCameraOverlap(int overlap)
{
    Command command(new amun::Command);
    command->mutable_simulator()->set_camera_overlap(overlap / 100.0f);
    emit sendCommand(command);
}

void SimulatorConfigWidget::updateWorstCaseVision()
{
    Command command(new amun::Command);
    command->mutable_simulator()->mutable_vision_worst_case()->set_min_ball_detection_time(
                ui->enableWorstCaseVision->isChecked() ? ui->worstCaseBallDetections->value() : 0);
    command->mutable_simulator()->mutable_vision_worst_case()->set_min_robot_detection_time(
                ui->enableWorstCaseVision->isChecked() ? ui->worstCaseRobotDetections->value() : 0);
    emit sendCommand(command);
}
