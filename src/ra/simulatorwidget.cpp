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
#include <QCheckBox>
#include <QDoubleSpinBox>
#include <QAction>

SimulatorWidget::SimulatorWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::SimulatorWidget),
    m_enableAutoPause(false),
    m_paused(false)
{
    ui->setupUi(this);

    ui->btnStart->setIcon(QIcon("icon:32/media-playback-start.png"));
    ui->btnStop->setIcon(QIcon("icon:32/media-playback-stop.png"));

    connect(ui->spinSpeed, SIGNAL(valueChanged(int)), SLOT(setSpeed(int)));
    connect(ui->btnStart, SIGNAL(clicked()), SLOT(start()));
    connect(ui->btnStop, SIGNAL(clicked()), SLOT(stop()));
    connect(ui->btnToggle, &QToolButton::clicked, this, &SimulatorWidget::toggleSimulatorRunning);

    QAction *actionSpeedIncrease = new QAction(this);
    actionSpeedIncrease->setShortcut(QKeySequence("+"));
    connect(actionSpeedIncrease, SIGNAL(triggered()), SLOT(increaseSpeed()));
    addAction(actionSpeedIncrease);

    QAction *actionSpeedDecrease = new QAction(this);
    actionSpeedDecrease->setShortcut(QKeySequence("-"));
    connect(actionSpeedDecrease, SIGNAL(triggered()), SLOT(decreaseSpeed()));
    addAction(actionSpeedDecrease);

    connect(qApp, &QGuiApplication::applicationStateChanged, this, &SimulatorWidget::handleAppState);
}

SimulatorWidget::~SimulatorWidget()
{
    delete ui;
}

void SimulatorWidget::setEnableAutoPause(bool autoPause)
{
    m_enableAutoPause = autoPause;
}

void SimulatorWidget::sendPauseSimulator(amun::PauseSimulatorReason reason, bool pause)
{
    Command command(new amun::Command);
    command->mutable_pause_simulator()->set_reason(reason);
    command->mutable_pause_simulator()->set_pause(pause);
    emit sendCommand(command);
}

void SimulatorWidget::handleStatus(const Status &status)
{
    if (status->has_timer_scaling()) {
        if (status->timer_scaling() != 0.0f) {
            ui->pausedState->setText("<font color=\"green\">Running</font>");
            ui->spinSpeed->blockSignals(true);
            ui->spinSpeed->setValue(int(status->timer_scaling() * 100.0f));
            ui->spinSpeed->blockSignals(false);
            m_paused = false;
        } else {
            ui->pausedState->setText("<font color=\"red\">Paused</font>");
            m_paused = true;
        }
    }
}

void SimulatorWidget::handleAppState(Qt::ApplicationState state)
{
    if (!m_enableAutoPause) {
        return;
    }

    bool isActive = (state == Qt::ApplicationActive);
    sendPauseSimulator(amun::WindowFocus, !isActive);
}

void SimulatorWidget::setSpeed(int speed)
{
    if (speed != ui->spinSpeed->value()) {
        ui->spinSpeed->setValue(speed);
        // called again by the value change
        return;
    }
    Command command(new amun::Command);
    command->mutable_simulator()->mutable_ssl_control()->set_simulation_speed(speed / 100.0f);
    emit sendCommand(command);
}

void SimulatorWidget::start()
{
    if (m_paused) {
        sendPauseSimulator(amun::Ui, false);
    } else {
        ui->spinSpeed->setValue(100);
    }
}

void SimulatorWidget::stop()
{
    sendPauseSimulator(amun::Ui, true);
}

void SimulatorWidget::increaseSpeed()
{
    ui->spinSpeed->setValue(ui->spinSpeed->value() + 10);
}

void SimulatorWidget::decreaseSpeed()
{
    ui->spinSpeed->setValue(ui->spinSpeed->value() - 10);
}

void SimulatorWidget::toggleSimulatorRunning()
{
    Command command(new amun::Command);
    command->mutable_pause_simulator()->set_reason(amun::Ui);
    command->mutable_pause_simulator()->set_toggle(true);
    emit sendCommand(command);
}
