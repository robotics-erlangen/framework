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
    emit sendCommand(command);
}

void ConfigDialog::load()
{
    QSettings s;
    ui->comboChannel->setCurrentIndex(s.value("Transceiver/Channel", DEFAULT_TRANSCEIVER_CHANNEL).toUInt());
    ui->systemDelayBox->setValue(s.value("Tracking/SystemDelay", DEFAULT_SYSTEM_DELAY).toUInt()); // in ms

    ui->simVisionDelay->setValue(s.value("Simulator/VisionDelay", DEFAULT_SIM_VISION_DELAY).toUInt());
    ui->simProcessingTime->setValue(s.value("Simulator/ProcessingTime", DEFAULT_SIM_PROCESSING_TIME).toUInt());

    sendConfiguration();
}

void ConfigDialog::reset()
{
    ui->comboChannel->setCurrentIndex(DEFAULT_TRANSCEIVER_CHANNEL);
    ui->systemDelayBox->setValue(DEFAULT_SYSTEM_DELAY);
    ui->simVisionDelay->setValue(DEFAULT_SIM_VISION_DELAY);
    ui->simProcessingTime->setValue(DEFAULT_SIM_PROCESSING_TIME);
}

void ConfigDialog::apply()
{
    QSettings s;
    s.setValue("Transceiver/Channel", ui->comboChannel->currentIndex());
    s.setValue("Tracking/SystemDelay", ui->systemDelayBox->value());

    s.setValue("Simulator/VisionDelay", ui->simVisionDelay->value());
    s.setValue("Simulator/ProcessingTime", ui->simProcessingTime->value());

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
