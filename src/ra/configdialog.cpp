/***************************************************************************
 *   Copyright 2015 Michael Bleier, Michael Eischer, Philipp Nordhus       *
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

#include "configdialog.h"
#include "ui_configdialog.h"
#include <QPushButton>
#include <QSettings>

const uint DEFAULT_SYSTEM_DELAY = 30; // in ms
const uint DEFAULT_TRANSCEIVER_CHANNEL = 11;
const uint DEFAULT_SIM_VISION_DELAY = 35; // in ms
const uint DEFAULT_SIM_PROCESSING_TIME = 5; // in ms
const uint DEFAULT_VISION_PORT = 10005;

const bool DEFAULT_NETWORK_ENABLE = false;
const QString DEFAULT_NETWORK_HOST = "";
const uint DEFAULT_NETWORK_PORT = 10010;

const QString DEFAULT_MIXED_HOST = "";
const uint DEFAULT_MIXED_PORT = 10012;

ConfigDialog::ConfigDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::ConfigDialog)
{
    ui->setupUi(this);
    connect(ui->buttonBox, SIGNAL(clicked(QAbstractButton*)), SLOT(clicked(QAbstractButton*)));
    connect(this, SIGNAL(rejected()), SLOT(load()));
}

ConfigDialog::~ConfigDialog()
{
    delete ui;
}

void ConfigDialog::sendConfiguration()
{
    Command command(new amun::Command);
    amun::TransceiverConfiguration *c = command->mutable_transceiver()->mutable_configuration();
    c->set_channel(ui->comboChannel->currentIndex());

    // from ms to ns
    command->mutable_tracking()->set_system_delay(ui->systemDelayBox->value() * 1000 * 1000);

    command->mutable_simulator()->set_vision_delay(ui->simVisionDelay->value() * 1000 * 1000);
    command->mutable_simulator()->set_vision_processing_time(ui->simProcessingTime->value() * 1000 * 1000);

    command->mutable_amun()->set_vision_port(ui->visionPort->value());

    command->mutable_transceiver()->set_use_network(ui->networkUse->isChecked());
    amun::HostAddress *nc = command->mutable_transceiver()->mutable_network_configuration();
    nc->set_host(ui->networkHost->text().toStdString());
    nc->set_port(ui->networkPort->value());

    command->mutable_strategy_yellow()->set_enable_refbox_control(ui->refboxControlUse->isChecked());

    command->mutable_mixed_team_destination()->set_host(ui->mixedHost->text().toStdString());
    command->mutable_mixed_team_destination()->set_port(ui->mixedPort->value());

    emit sendCommand(command);
}

void ConfigDialog::load()
{
    QSettings s;
    ui->comboChannel->setCurrentIndex(s.value("Transceiver/Channel", DEFAULT_TRANSCEIVER_CHANNEL).toUInt());
    ui->systemDelayBox->setValue(s.value("Tracking/SystemDelay", DEFAULT_SYSTEM_DELAY).toUInt()); // in ms

    ui->simVisionDelay->setValue(s.value("Simulator/VisionDelay", DEFAULT_SIM_VISION_DELAY).toUInt());
    ui->simProcessingTime->setValue(s.value("Simulator/ProcessingTime", DEFAULT_SIM_PROCESSING_TIME).toUInt());

    ui->visionPort->setValue(s.value("Amun/VisionPort", DEFAULT_VISION_PORT).toUInt());

    ui->networkUse->setChecked(s.value("Network/Use", DEFAULT_NETWORK_ENABLE).toBool());
    ui->networkHost->setText(s.value("Network/Host", DEFAULT_NETWORK_HOST).toString());
    ui->networkPort->setValue(s.value("Network/Port", DEFAULT_NETWORK_PORT).toUInt());

    ui->mixedHost->setText(s.value("Mixed/Host", DEFAULT_MIXED_HOST).toString());
    ui->mixedPort->setValue(s.value("Mixed/Port", DEFAULT_MIXED_PORT).toUInt());
    sendConfiguration();
}

void ConfigDialog::reset()
{
    ui->comboChannel->setCurrentIndex(DEFAULT_TRANSCEIVER_CHANNEL);
    ui->systemDelayBox->setValue(DEFAULT_SYSTEM_DELAY);
    ui->simVisionDelay->setValue(DEFAULT_SIM_VISION_DELAY);
    ui->simProcessingTime->setValue(DEFAULT_SIM_PROCESSING_TIME);
    ui->visionPort->setValue(DEFAULT_VISION_PORT);
    ui->networkUse->setChecked(DEFAULT_NETWORK_ENABLE);
    ui->networkHost->setText(DEFAULT_NETWORK_HOST);
    ui->networkPort->setValue(DEFAULT_NETWORK_PORT);
    ui->mixedHost->setText(DEFAULT_MIXED_HOST);
    ui->mixedPort->setValue(DEFAULT_MIXED_PORT);
}

void ConfigDialog::apply()
{
    QSettings s;
    s.setValue("Transceiver/Channel", ui->comboChannel->currentIndex());
    s.setValue("Tracking/SystemDelay", ui->systemDelayBox->value());

    s.setValue("Simulator/VisionDelay", ui->simVisionDelay->value());
    s.setValue("Simulator/ProcessingTime", ui->simProcessingTime->value());

    s.setValue("Amun/VisionPort", ui->visionPort->value());

    s.setValue("Network/Use", ui->networkUse->isChecked());
    s.setValue("Network/Host", ui->networkHost->text());
    s.setValue("Network/Port", ui->networkPort->value());

    s.setValue("Mixed/Host", ui->mixedHost->text());
    s.setValue("Mixed/Port", ui->mixedPort->value());
    sendConfiguration();
}

void ConfigDialog::clicked(QAbstractButton *button)
{
    switch (ui->buttonBox->buttonRole(button)) {
    case QDialogButtonBox::AcceptRole:
        apply();
        break;
    case QDialogButtonBox::ResetRole:
        reset();
        break;
    case QDialogButtonBox::RejectRole:
        load();
        break;
    default:
        break;
    }
}
