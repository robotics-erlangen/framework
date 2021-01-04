/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#include "replayteamwidget.h"
#include "ui_replayteamwidget.h"
#include "protobuf/status.pb.h"

ReplayTeamWidget::ReplayTeamWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::ReplayTeamWidget)
{
    ui->setupUi(this);
    ui->blue->init(amun::StatusStrategyWrapper::REPLAY_BLUE);
    ui->yellow->init(amun::StatusStrategyWrapper::REPLAY_YELLOW);

    ui->blue->load();
    ui->yellow->load();

    connect(ui->replayBlue, SIGNAL(clicked(bool)), ui->blue, SLOT(setEnabled(bool)));
    connect(ui->replayYellow, SIGNAL(clicked(bool)), ui->yellow, SLOT(setEnabled(bool)));
    connect(ui->replayBlue, SIGNAL(clicked(bool)), this, SLOT(strategyBlueEnabled(bool)));
    connect(ui->replayYellow, SIGNAL(clicked(bool)), this, SLOT(strategyYellowEnabled(bool)));
    connect(ui->trackingReplay, &QCheckBox::toggled, this, &ReplayTeamWidget::trackingReplayChanged);

    connect(ui->blue, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
    connect(ui->yellow, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
    connect(this, SIGNAL(gotStatus(Status)), ui->blue, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->yellow, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(setUseDarkColors(bool)), ui->blue, SLOT(setUseDarkColors(bool)));
    connect(this, SIGNAL(setUseDarkColors(bool)), ui->yellow, SLOT(setUseDarkColors(bool)));

    ui->blue->enableDebugger(false);
    ui->yellow->enableDebugger(false);
}

ReplayTeamWidget::~ReplayTeamWidget()
{
    delete ui;
}

void ReplayTeamWidget::trackingReplayChanged(bool enabled)
{
    if (enabled) {
        ui->replayBlue->setChecked(false);
        ui->replayYellow->setChecked(false);
    }
    ui->replayBlue->setEnabled(!enabled);
    ui->replayYellow->setEnabled(!enabled);
    ui->blue->setEnabled(!enabled && ui->replayBlue->isChecked());
    ui->yellow->setEnabled(!enabled && ui->replayYellow->isChecked());

    Command command(new amun::Command);
    command->mutable_tracking()->set_tracking_replay_enabled(enabled);
    emit sendCommand(command);
}

void ReplayTeamWidget::setRecentScriptList(const std::shared_ptr<QStringList> &list)
{
    ui->blue->setRecentScripts(list);
    ui->yellow->setRecentScripts(list);
}

void ReplayTeamWidget::strategyBlueEnabled(bool enabled)
{
    Command command(new amun::Command);
    command->mutable_replay()->set_enable_blue_strategy(enabled);
    emit sendCommand(command);
    if (enabled) {
        emit sendResetDebugPacket(true);
    }
    emit setRegularVisualizationsEnabled(true, !enabled);
}

void ReplayTeamWidget::strategyYellowEnabled(bool enabled)
{
    Command command(new amun::Command);
    command->mutable_replay()->set_enable_yellow_strategy(enabled);
    emit sendCommand(command);
    if (enabled) {
        emit sendResetDebugPacket(false);
    }
    emit setRegularVisualizationsEnabled(false, !enabled);
}
