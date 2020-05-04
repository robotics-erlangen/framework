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
const uint DEFAULT_VISION_PORT = 10006;
const uint DEFAULT_REFEREE_PORT = 10003;

const bool DEFAULT_NETWORK_ENABLE = false;
const QString DEFAULT_NETWORK_HOST = QStringLiteral("");
const uint DEFAULT_NETWORK_PORT = 10010;

const QString DEFAULT_MIXED_HOST = QStringLiteral("");
const uint DEFAULT_MIXED_PORT = 10012;

const bool DEFAULT_UI_DARK_MODE_COLORS = false;

const FieldWidgetAction DEFAULT_ROBOT_DOUBLE_CLICK_ACTION = FieldWidgetAction::ToggleVisualization;
const QString DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING = ".*: <id>";

const FieldWidgetAction DEFAULT_ROBOT_CTRL_CLICK_ACTION = FieldWidgetAction::None;
const QString DEFAULT_ROBOT_CTRL_CLICK_SEARCH_STRING = "";

const QString DEFAULT_NUMBER_KEYS_USAGE = "Internal Referee";

ConfigDialog::ConfigDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::ConfigDialog)
{
    ui->setupUi(this);
    connect(ui->buttonBox, SIGNAL(clicked(QAbstractButton*)), SLOT(clicked(QAbstractButton*)));
    connect(this, SIGNAL(rejected()), SLOT(load()));

    for (FieldWidgetAction action : {FieldWidgetAction::None, FieldWidgetAction::SetDebugSearch, FieldWidgetAction::ToggleVisualization}) {
        ui->doubleClickAction->addItem(robotActionString(action), static_cast<int>(action));
        ui->ctrlClickAction->addItem(robotActionString(action), static_cast<int>(action));
    }
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

    command->mutable_amun()->set_vision_port(ui->visionPort->value());
    command->mutable_amun()->set_referee_port(ui->refPort->value());

    command->mutable_transceiver()->set_use_network(ui->networkUse->isChecked());
    amun::HostAddress *nc = command->mutable_transceiver()->mutable_network_configuration();
    nc->set_host(ui->networkHost->text().toStdString());
    nc->set_port(ui->networkPort->value());

    command->mutable_mixed_team_destination()->set_host(ui->mixedHost->text().toStdString());
    command->mutable_mixed_team_destination()->set_port(ui->mixedPort->value());

    emit sendCommand(command);

    emit useDarkModeColors(ui->uiDarkMode->isChecked());
    emit useNumKeysForReferee(ui->numKeyUsage->currentText() == DEFAULT_NUMBER_KEYS_USAGE);

    emit setRobotDoubleClickAction(static_cast<FieldWidgetAction>(ui->doubleClickAction->currentData().toInt()),
                                   ui->doubleClickSearch->text());
    emit setRobotCtrlClickAction(static_cast<FieldWidgetAction>(ui->ctrlClickAction->currentData().toInt()),
                                 ui->ctrlClickSearch->text());
}

void ConfigDialog::load()
{
    QSettings s;
    ui->comboChannel->setCurrentIndex(s.value("Transceiver/Channel", DEFAULT_TRANSCEIVER_CHANNEL).toUInt());
    ui->systemDelayBox->setValue(s.value("Tracking/SystemDelay", DEFAULT_SYSTEM_DELAY).toUInt()); // in ms

    ui->visionPort->setValue(s.value("Amun/VisionPort2018", DEFAULT_VISION_PORT).toUInt());
    ui->refPort->setValue(s.value("Amun/RefereePort", DEFAULT_REFEREE_PORT).toUInt());

    ui->networkUse->setChecked(s.value("Network/Use", DEFAULT_NETWORK_ENABLE).toBool());
    ui->networkHost->setText(s.value("Network/Host", DEFAULT_NETWORK_HOST).toString());
    ui->networkPort->setValue(s.value("Network/Port", DEFAULT_NETWORK_PORT).toUInt());

    ui->mixedHost->setText(s.value("Mixed/Host", DEFAULT_MIXED_HOST).toString());
    ui->mixedPort->setValue(s.value("Mixed/Port", DEFAULT_MIXED_PORT).toUInt());

    ui->uiDarkMode->setChecked(s.value("Ui/DarkModeColors", DEFAULT_UI_DARK_MODE_COLORS).toBool());
    ui->numKeyUsage->setCurrentText(s.value("Ui/NumKeyUsage", DEFAULT_NUMBER_KEYS_USAGE).toString());

    FieldWidgetAction robotDoubleClick = static_cast<FieldWidgetAction>(s.value("Ui/RobotDoubleClickAction", static_cast<int>(DEFAULT_ROBOT_DOUBLE_CLICK_ACTION)).toInt());
    ui->doubleClickAction->setCurrentText(robotActionString(robotDoubleClick));
    ui->doubleClickSearch->setText(s.value("Ui/RobotDoubleClickSearch", DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING).toString());

    FieldWidgetAction robotCtrlClick = static_cast<FieldWidgetAction>(s.value("Ui/RobotCtrlClickAction", static_cast<int>(DEFAULT_ROBOT_CTRL_CLICK_ACTION)).toInt());
    ui->ctrlClickAction->setCurrentText(robotActionString(robotCtrlClick));
    ui->ctrlClickSearch->setText(s.value("Ui/RobotCtrlClickSearch", DEFAULT_ROBOT_CTRL_CLICK_SEARCH_STRING).toString());

    sendConfiguration();
}

void ConfigDialog::reset()
{
    ui->comboChannel->setCurrentIndex(DEFAULT_TRANSCEIVER_CHANNEL);
    ui->systemDelayBox->setValue(DEFAULT_SYSTEM_DELAY);
    ui->visionPort->setValue(DEFAULT_VISION_PORT);
    ui->refPort->setValue(DEFAULT_REFEREE_PORT);
    ui->networkUse->setChecked(DEFAULT_NETWORK_ENABLE);
    ui->networkHost->setText(DEFAULT_NETWORK_HOST);
    ui->networkPort->setValue(DEFAULT_NETWORK_PORT);
    ui->mixedHost->setText(DEFAULT_MIXED_HOST);
    ui->mixedPort->setValue(DEFAULT_MIXED_PORT);
    ui->uiDarkMode->setChecked(DEFAULT_UI_DARK_MODE_COLORS);
    ui->doubleClickAction->setCurrentText(robotActionString(DEFAULT_ROBOT_DOUBLE_CLICK_ACTION));
    ui->doubleClickSearch->setText(DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING);
    ui->ctrlClickAction->setCurrentText(robotActionString(DEFAULT_ROBOT_CTRL_CLICK_ACTION));
    ui->ctrlClickSearch->setText(DEFAULT_ROBOT_CTRL_CLICK_SEARCH_STRING);
    ui->numKeyUsage->setCurrentText(DEFAULT_NUMBER_KEYS_USAGE);

    sendConfiguration();
}

void ConfigDialog::apply()
{
    QSettings s;
    s.setValue("Transceiver/Channel", ui->comboChannel->currentIndex());
    s.setValue("Tracking/SystemDelay", ui->systemDelayBox->value());

    s.setValue("Amun/VisionPort2018", ui->visionPort->value());
    s.setValue("Amun/RefereePort", ui->refPort->value());

    s.setValue("Network/Use", ui->networkUse->isChecked());
    s.setValue("Network/Host", ui->networkHost->text());
    s.setValue("Network/Port", ui->networkPort->value());

    s.setValue("Mixed/Host", ui->mixedHost->text());
    s.setValue("Mixed/Port", ui->mixedPort->value());

    s.setValue(("Ui/DarkModeColors"), ui->uiDarkMode->isChecked());

    s.setValue("Ui/RobotDoubleClickAction", ui->doubleClickAction->currentData().toInt());
    s.setValue("Ui/RobotDoubleClickSearch", ui->doubleClickSearch->text());
    s.setValue("Ui/RobotCtrlClickAction", ui->ctrlClickAction->currentData().toInt());
    s.setValue("Ui/RobotCtrlClickSearch", ui->ctrlClickSearch->text());

    s.setValue("Ui/NumKeyUsage", ui->numKeyUsage->currentText());

    sendConfiguration();
}

bool ConfigDialog::numKeysUsedForReferee() const
{
    return ui->numKeyUsage->currentText() == DEFAULT_NUMBER_KEYS_USAGE;
}

QString ConfigDialog::robotActionString(FieldWidgetAction action)
{
    switch (action) {
    case FieldWidgetAction::None:
        return "None";
    case FieldWidgetAction::SetDebugSearch:
        return "Set Debug Search";
    case FieldWidgetAction::ToggleVisualization:
        return "Toogle Visualization";
    }
    return "";
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
