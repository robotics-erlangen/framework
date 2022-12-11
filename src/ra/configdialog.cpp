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
#include "core/sslprotocols.h"
#include <QPushButton>
#include <QSettings>
#include <QStyleFactory>
#include <QColorDialog>
#include <QToolBar>
#include <QDebug>

const uint DEFAULT_SYSTEM_DELAY = 30; // in ms
const uint DEFAULT_TRANSCEIVER_CHANNEL = 11;
const uint DEFAULT_VISION_PORT = SSL_VISION_PORT;
const uint DEFAULT_REFEREE_PORT = SSL_GAME_CONTROLLER_PORT;

const bool DEFAULT_NETWORK_ENABLE = false;
const QString DEFAULT_NETWORK_HOST = QStringLiteral("");
const uint DEFAULT_NETWORK_PORT = SSL_SIMULATION_CONTROL_PORT;
const uint DEFAULT_NETWORK_PORT_BLUE = SSL_SIMULATION_CONTROL_BLUE_PORT;
const uint DEFAULT_NETWORK_PORT_YELLOW = SSL_SIMULATION_CONTROL_YELLOW_PORT;
const bool DEFAULT_CONTROL_SIMULATOR = false;
const bool DEFAULT_CONTROL_BLUE = false;
const bool DEFAULT_CONTROL_YELLOW = false;

const QString DEFAULT_MIXED_HOST = QStringLiteral("");
const uint DEFAULT_MIXED_PORT = SSL_MIXED_TEAM_PORT;

const FieldWidgetAction DEFAULT_ROBOT_DOUBLE_CLICK_ACTION = FieldWidgetAction::ToggleVisualization;
const QString DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING_2020 = ".*: <id>";
const QString DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING = ".*: <id><team-s>";

const FieldWidgetAction DEFAULT_ROBOT_CTRL_CLICK_ACTION = FieldWidgetAction::SetDebugSearch;
const QString DEFAULT_ROBOT_CTRL_CLICK_SEARCH_STRING = "<team>/agent <id>";

const QString DEFAULT_NUMBER_KEYS_USAGE = "Simulator Speed";
const QString CURRENT_CONFIG_DATE = "20210112";
const QString PREALL_CONFIG_DATE = "20201212";

const float DEFAULT_SCROLL_SENSITIVITY = 1;

static QPalette createQPalette(const QColor foreground, const QColor background, const QColor alternateBackground,
                               const QColor disabled, const QColor highlight, const QColor link) {
    QPalette palette;
    palette.setColor(QPalette::Window, background);
    palette.setColor(QPalette::WindowText, foreground);
    palette.setColor(QPalette::Disabled, QPalette::WindowText, disabled);

    const int backgroundValue = background.value();
    const int foregroundValue = foreground.value();
    const bool isDarkMode = backgroundValue < foregroundValue;
    const auto base = isDarkMode ? background.darker(150) : background.lighter(150);
    palette.setColor(QPalette::Base, base);
    palette.setColor(QPalette::AlternateBase, alternateBackground);

    palette.setColor(QPalette::ToolTipBase, background);
    palette.setColor(QPalette::ToolTipText, foreground);

    palette.setColor(QPalette::Text, foreground);
    palette.setColor(QPalette::Disabled, QPalette::Text, disabled);

    palette.setColor(QPalette::Button, background);
    palette.setColor(QPalette::ButtonText, foreground);
    palette.setColor(QPalette::Disabled, QPalette::ButtonText, disabled);

    palette.setColor(QPalette::BrightText, Qt::white);

    palette.setColor(QPalette::Light, background.lighter(150));
    palette.setColor(QPalette::Midlight, background.lighter(125));
    palette.setColor(QPalette::Dark, background.darker(200));
    palette.setColor(QPalette::Mid, background.darker(150));
    palette.setColor(QPalette::Shadow, Qt::black);

    palette.setColor(QPalette::Highlight, highlight);
    palette.setColor(QPalette::HighlightedText, Qt::white);
    palette.setColor(QPalette::Disabled, QPalette::HighlightedText, disabled);

    palette.setColor(QPalette::Link, link);

    return palette;
}

static const QStringList COLOR_SCHEME_ITEMS = {"Default", "Light", "Dark", "Custom"};

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

    connect(ui->colorScheme, SIGNAL(currentIndexChanged(int)), this, SLOT(changedPalette(int)));
    m_defaultPalette = palette();

    const auto availableStyles = QStyleFactory::keys();
    ui->qStyle->addItems(availableStyles);

    if (availableStyles.size() == 2 && availableStyles.contains("Fusion")) {
        ui->qStyle->setCurrentText("Fusion");
    }

    ui->customColors->hide();

    ui->colorScheme->addItems(COLOR_SCHEME_ITEMS);
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
    nc->set_port(ui->networkPortSimulator->value());

    amun::SimulatorNetworking *sn = command->mutable_transceiver()->mutable_simulator_configuration();
    sn->set_port_blue(ui->networkPortBlue->value());
    sn->set_port_yellow(ui->networkPortYellow->value());

    sn->set_control_simulator(ui->controlSimulator->isChecked());
    sn->set_control_blue(ui->controlBlue->isChecked());
    sn->set_control_yellow(ui->controlYellow->isChecked());

    command->mutable_mixed_team_destination()->set_host(ui->mixedHost->text().toStdString());
    command->mutable_mixed_team_destination()->set_port(ui->mixedPort->value());

    emit sendCommand(command);

    emit useNumKeysForReferee(ui->numKeyUsage->currentText() != DEFAULT_NUMBER_KEYS_USAGE);

    emit setRobotDoubleClickAction(static_cast<FieldWidgetAction>(ui->doubleClickAction->currentData().toInt()),
                                   ui->doubleClickSearch->text());
    emit setRobotCtrlClickAction(static_cast<FieldWidgetAction>(ui->ctrlClickAction->currentData().toInt()),
                                 ui->ctrlClickSearch->text());

    emit setScrollSensitivity(ui->scrollSensitivitySpinBox->value());

    const auto style = QStyleFactory::create(ui->qStyle->currentText());
    const auto colorSchemeSetting = ui->colorScheme->currentText();
    QPalette palette;
    if (colorSchemeSetting == "Default") {
        palette = style->standardPalette();
    } else if (colorSchemeSetting == "Light") {
        const auto foreground = QColor(35, 38, 41);
        const auto background = QColor(239, 240, 241);
        const auto alternateBackground = QColor(189, 195, 197);
        const auto disabled = QColor(127, 140, 141);
        const auto highlight = QColor(61, 174, 233);
        const auto link = QColor(41, 128, 185);
        palette = createQPalette(foreground, background, alternateBackground, disabled, highlight, link);
    } else if (colorSchemeSetting == "Dark") {
        const auto foreground = QColor(239, 240, 241);
        const auto background = QColor(49, 54, 59);
        const auto alternateBackground = QColor(77, 77, 77);
        const auto disabled = QColor(189, 195, 199);
        const auto highlight = QColor(61, 174, 233);
        const auto link = QColor(41, 128, 185);
        palette = createQPalette(foreground, background, alternateBackground, disabled, highlight, link);
    } else {
        const auto customPalette = ui->customColors->getCustomPalette();
        // const auto foreground = ui->foregroundColor->getColor();
        // const auto background = ui->backgroundColor->getColor();
        // const auto alternateBackground = ui->alternateBackgroundColor->getColor();
        // const auto disabled = ui->disabledColor->getColor();
        // const auto highlight = ui->highlightColor->getColor();
        // const auto link = ui->linkColor->getColor();
        palette = createQPalette(customPalette.foreground, customPalette.background, customPalette.alternateBackground, customPalette.disabled,
                                 customPalette.highlight, customPalette.link);
    }

    QApplication::setStyle(style);

    // for some reason you need both to the QApplication::setPalette and the setPalette for every widget
    // don't ask me why, it's Qt magic
    QApplication::setPalette(palette);
    for (auto widget : QApplication::allWidgets()) {
        widget->setPalette(palette);
    }

    emit setPalette(palette);
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

    ui->controlSimulator->setChecked(s.value("Network/ControlSimulator", DEFAULT_CONTROL_SIMULATOR).toBool());
    ui->networkPortSimulator->setValue(s.value("Network/PortControl", DEFAULT_NETWORK_PORT).toUInt());

    ui->controlBlue->setChecked(s.value("Network/ControlBlue", DEFAULT_CONTROL_BLUE).toBool());
    ui->networkPortBlue->setValue(s.value("Network/PortBlue", DEFAULT_NETWORK_PORT_BLUE).toUInt());

    ui->controlYellow->setChecked(s.value("Network/ControlYellow", DEFAULT_CONTROL_YELLOW).toBool());
    ui->networkPortYellow->setValue(s.value("Network/PortYellow", DEFAULT_NETWORK_PORT_YELLOW).toUInt());

    ui->mixedHost->setText(s.value("Mixed/Host", DEFAULT_MIXED_HOST).toString());
    ui->mixedPort->setValue(s.value("Mixed/Port", DEFAULT_MIXED_PORT).toUInt());

    ui->numKeyUsage->setCurrentText(s.value("Ui/NumKeyUsage", DEFAULT_NUMBER_KEYS_USAGE).toString());

    FieldWidgetAction robotDoubleClick = static_cast<FieldWidgetAction>(s.value("Ui/RobotDoubleClickAction", static_cast<int>(DEFAULT_ROBOT_DOUBLE_CLICK_ACTION)).toInt());
    ui->doubleClickAction->setCurrentText(robotActionString(robotDoubleClick));
    ui->doubleClickSearch->setText(s.value("Ui/RobotDoubleClickSearch", DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING).toString());

    FieldWidgetAction robotCtrlClick = static_cast<FieldWidgetAction>(s.value("Ui/RobotCtrlClickAction", static_cast<int>(DEFAULT_ROBOT_CTRL_CLICK_ACTION)).toInt());
    ui->ctrlClickAction->setCurrentText(robotActionString(robotCtrlClick));
    ui->ctrlClickSearch->setText(s.value("Ui/RobotCtrlClickSearch", DEFAULT_ROBOT_CTRL_CLICK_SEARCH_STRING).toString());

    m_defaultVersionString = s.value("Config/ConfigDialogDefaultVersion", PREALL_CONFIG_DATE).toString();
    if (m_defaultVersionString != CURRENT_CONFIG_DATE) {
        // Sanitize old double click search string
        if (ui->doubleClickSearch->text() == DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING_2020) {
            ui->doubleClickSearch->setText(DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING);
        }

    }

    ui->scrollSensitivitySpinBox->setValue(s.value("Ui/ScrollSensitivity", DEFAULT_SCROLL_SENSITIVITY).toDouble());

    if (s.contains("Ui/QStyle")) {
        const auto loadedQStyle = s.value("Ui/QStyle").toString();
        if (QStyleFactory::keys().contains(loadedQStyle)) {
            ui->qStyle->setCurrentText(loadedQStyle);
        }
        ui->colorScheme->setCurrentText(s.value("Ui/ColorScheme").toString());
    }

    ui->customColors->load();

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
    ui->controlSimulator->setChecked(DEFAULT_CONTROL_SIMULATOR);
    ui->networkPortSimulator->setValue(DEFAULT_NETWORK_PORT);
    ui->controlBlue->setChecked(DEFAULT_CONTROL_BLUE);
    ui->networkPortBlue->setValue(DEFAULT_NETWORK_PORT_BLUE);
    ui->controlYellow->setChecked(DEFAULT_CONTROL_YELLOW);
    ui->networkPortYellow->setValue(DEFAULT_NETWORK_PORT_YELLOW);
    ui->mixedHost->setText(DEFAULT_MIXED_HOST);
    ui->mixedPort->setValue(DEFAULT_MIXED_PORT);
    ui->doubleClickAction->setCurrentText(robotActionString(DEFAULT_ROBOT_DOUBLE_CLICK_ACTION));
    ui->doubleClickSearch->setText(DEFAULT_ROBOT_DOUBLE_CLICK_SEARCH_STRING);
    ui->ctrlClickAction->setCurrentText(robotActionString(DEFAULT_ROBOT_CTRL_CLICK_ACTION));
    ui->ctrlClickSearch->setText(DEFAULT_ROBOT_CTRL_CLICK_SEARCH_STRING);
    ui->numKeyUsage->setCurrentText(DEFAULT_NUMBER_KEYS_USAGE);
    ui->scrollSensitivitySpinBox->setValue(DEFAULT_SCROLL_SENSITIVITY);

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
    s.setValue("Network/ControlSimulator", ui->controlSimulator->isChecked());
    s.setValue("Network/PortControl", ui->networkPortSimulator->value());
    s.setValue("Network/ControlBlue", ui->controlBlue->isChecked());
    s.setValue("Network/PortBlue", ui->networkPortBlue->value());
    s.setValue("Network/ControlYellow", ui->controlYellow->isChecked());
    s.setValue("Network/PortYellow", ui->networkPortYellow->value());

    s.setValue("Mixed/Host", ui->mixedHost->text());
    s.setValue("Mixed/Port", ui->mixedPort->value());

    s.setValue("Ui/RobotDoubleClickAction", ui->doubleClickAction->currentData().toInt());
    s.setValue("Ui/RobotDoubleClickSearch", ui->doubleClickSearch->text());
    s.setValue("Ui/RobotCtrlClickAction", ui->ctrlClickAction->currentData().toInt());
    s.setValue("Ui/RobotCtrlClickSearch", ui->ctrlClickSearch->text());

    s.setValue("Ui/NumKeyUsage", ui->numKeyUsage->currentText());
    s.setValue("Config/ConfigDialogDefaultVersion", CURRENT_CONFIG_DATE);

    s.setValue("Ui/QStyle", ui->qStyle->currentText());
    s.setValue("Ui/ColorScheme", ui->colorScheme->currentText());
    ui->customColors->save();

    s.setValue("Ui/ScrollSensitivity", ui->scrollSensitivitySpinBox->value());

    sendConfiguration();
}

bool ConfigDialog::numKeysUsedForReferee() const
{
    return ui->numKeyUsage->currentText() != DEFAULT_NUMBER_KEYS_USAGE;
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

void ConfigDialog::changedPalette(int newIndex) {
    if (newIndex == 3) {
        ui->customColors->show();
    } else {
        ui->customColors->hide();
    }
}
