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

#include "robotwidget.h"
#include "guihelper/guitimer.h"
#include "input/inputmanager.h"
#include <QContextMenuEvent>
#include <QHBoxLayout>
#include <QLabel>
#include <QMenu>
#include <QPainter>
#include <QTime>
#include <QWindow>
#include <cmath>

RobotWidget::RobotWidget(InputManager *inputManager, bool is_generation, QWidget *parent) :
    QWidget(parent),
    m_isGeneration(is_generation),
    m_statusCtr(0),
    m_lastBatteryLevel(0),
    m_smoothedBatteryLevel(0),
    m_inputManager(inputManager),
    m_strategyControlled(false)
{
    QHBoxLayout *layout = new QHBoxLayout(this);
    layout->setMargin(0);
    layout->setSpacing(3);

    m_teamMenu = new QMenu(this);
    m_teamGroup = new QActionGroup(this);
    connect(m_teamMenu, SIGNAL(triggered(QAction*)), SLOT(selectTeam(QAction*)));

    setDefaultTeamTypes();

    m_team = new QToolButton;
    m_team->setAutoRaise(true);
    m_team->setPopupMode(QToolButton::InstantPopup);
    m_team->setMenu(m_teamMenu);
    layout->addWidget(m_team);

    m_nameLabel = new QLabel;
    layout->addWidget(m_nameLabel);

    layout->addStretch(1);

    if (!m_isGeneration) {
        // tightly pack icons
        QLayout *iconLayout = new QHBoxLayout;
        iconLayout->setMargin(0);
        iconLayout->setSpacing(0);

        setupIcon(m_warning, "icon:16/dialog-warning.png", iconLayout);

        setupIcon(m_breakBeamError, "icon:16/kick_bb.png", iconLayout, "Break beam is not working!");
        setupIcon(m_kickerError, "icon:16/kick_cha.png", iconLayout, "Kicker damaged");

        setupIcon(m_motorVLError, "icon:16/mot_vl.png", iconLayout, "Motor VL has problems");
        setupIcon(m_motorHLError, "icon:16/mot_hl.png", iconLayout, "Motor HL has problems");
        setupIcon(m_motorHRError, "icon:16/mot_hr.png", iconLayout, "Motor HR has problems");
        setupIcon(m_motorVRError, "icon:16/mot_vr.png", iconLayout, "Motor VR has problems");
        setupIcon(m_motorDribblerError, "icon:16/mot2_d.png", iconLayout, "Dribbler has problems");

        setupIcon(m_tempMid, "icon:16/temp_mid.png", iconLayout);
        setupIcon(m_tempHigh, "icon:16/temp_high.png", iconLayout);

        setupIcon(m_ball, "icon:16/ball.png", iconLayout, "Ball detected");
        setupIcon(m_capCharged, "icon:16/capacitor.png", iconLayout, "Capacitor charged");

        setupIcon(m_batteryEmpty, "icon:16/bat_25.png", iconLayout);
        setupIcon(m_batteryLow, "icon:16/bat_50.png", iconLayout);
        setupIcon(m_batteryMid, "icon:16/bat_75.png", iconLayout);
        setupIcon(m_batteryFull, "icon:16/bat_100.png", iconLayout);

        setupIcon(m_rfBad, "icon:16/rf_25.png", iconLayout);
        setupIcon(m_rfOkay, "icon:16/rf_50.png", iconLayout);
        setupIcon(m_rfGood, "icon:16/rf_75.png", iconLayout);
        setupIcon(m_rfExcellent, "icon:16/rf_100.png", iconLayout);

        setupIcon(m_exchangeRobot, "icon:16/exchange.png", iconLayout);

        layout->addLayout(iconLayout);
    }

    if (!m_isGeneration) {
        connect(this, SIGNAL(addBinding(uint,uint,QString)), inputManager, SLOT(addBinding(uint,uint,QString)));
        connect(this, SIGNAL(removeBinding(uint,uint)), inputManager, SLOT(removeBinding(uint,uint)));
        connect(this, SIGNAL(strategyControlled(uint,uint,bool)), inputManager, SLOT(setStrategyControlled(uint,uint,bool)));
        connect(this, SIGNAL(networkControlled(uint,uint,bool)), inputManager, SLOT(setNetworkControlled(uint,uint,bool)));
        connect(this, SIGNAL(ejectSdcard(uint,uint)), inputManager, SLOT(setEjectSdcard(uint,uint)));
    }
    connect(inputManager, SIGNAL(devicesUpdated()), SLOT(updateInputMenu()));

    m_inputLabel = new QLabel;
    m_inputLabel->hide();
    layout->addWidget(m_inputLabel);

    m_inputDeviceGroup = new QActionGroup(this);
    m_inputMenu = new QMenu(this);

    m_btnControl = new QToolButton;
    m_btnControl->setMenu(m_inputMenu);
    m_btnControl->setAutoRaise(true);
    m_btnControl->setPopupMode(QToolButton::InstantPopup);
    layout->addWidget(m_btnControl);
    // calls updateInputMenu
    selectTeam(NoTeam);
    if (!m_isGeneration) {
        disableInput();
    }

    m_guiUpdateTimer = new GuiTimer(100, this);
    connect(m_guiUpdateTimer, &GuiTimer::timeout, this, &RobotWidget::updateRobotStatus);

    m_guiResponseTimer = new GuiTimer(1000, this);
    connect(m_guiResponseTimer, &GuiTimer::timeout, this, &RobotWidget::hideRobotStatus);

    m_exchangeRobotTimer = new GuiTimer(1000, this);
    connect(m_exchangeRobotTimer, &GuiTimer::timeout, this, &RobotWidget::hideExchangeRobot);
    m_exchangeRobotUpdated = false;
}

RobotWidget::~RobotWidget()
{
    emit removeBinding(m_specs.generation(), m_specs.id());
}

void RobotWidget::setIsSimulator(bool simulator) {
    if (simulator) {
        if (m_isGeneration) {
            addTeamType("6v6", Select6v6);
            addTeamType("11v11", Select11v11);
        } else {
            addTeamType("Both", Mixed);
        }
    } else {
        m_teamMenu->clear();
        setDefaultTeamTypes();
    }
}

void RobotWidget::setDefaultTeamTypes() {
    if (m_isGeneration) {
        // partial blue and yellow only set the team of the first half of the robots
        addTeamType("No Team", NoTeam);
        addTeamType("All Blue", Blue);
        addTeamType("All Yellow", Yellow);
        // TODO maybe rename this function to be more general since SwapTeam is more of an action and not a team type
        addTeamType("Swap teams", SwapTeam);
    } else {
        addTeamType("No team", NoTeam);
        addTeamType("Blue", Blue);
        addTeamType("Yellow", Yellow);
        // Assume we are created in the real world, we will get a signal if we start being in a simulation.
    }
}

void RobotWidget::addTeamType(const QString &name, const RobotWidget::Team team)
{
    QAction *action = m_teamMenu->addAction(name);
    action->setData(team);
    if (!m_isGeneration) {
        action->setCheckable(true);
        m_teamGroup->addAction(action);
    }
}

void RobotWidget::setupIcon(QLabel *&label, const QString &iconPath, QLayout *layout, const QString &toolTip)
{
    label = new QLabel;
    label->setPixmap(QIcon(iconPath).pixmap(16, 16));
    label->hide();
    label->setToolTip(toolTip);
    layout->addWidget(label);
}

void RobotWidget::setSpecs(const robot::Specs &specs)
{
    m_specs = specs;
    if (m_isGeneration) {
        if (specs.has_type() && specs.type() == robot::Specs::Ally) {
            m_nameLabel->setText("Ally");
        } else {
            m_nameLabel->setText(QString("Generation %1").arg(specs.year()));
        }
    } else {
        m_nameLabel->setText(QString("%1").arg(specs.id()));
    }
}

void RobotWidget::setStrategyControlled(bool isControlled)
{
    m_strategyControlled = isControlled;
    emit strategyControlled(m_specs.generation(), m_specs.id(), m_strategyControlled);
}

void RobotWidget::selectInput()
{
    QAction *action = dynamic_cast<QAction*>(sender());
    Q_ASSERT(action);
    selectInput(action->data().toString());
}

void RobotWidget::disableInput()
{
    selectInput(QString());
}

void RobotWidget::selectInput(const QString &inputDevice) {
    if (m_isGeneration) {
        emit inputDeviceSelected(m_specs.generation(), inputDevice);
        return;
    }

    m_inputDevice = inputDevice;

    bool isNetwork = m_inputDevice == "Network";
    emit networkControlled(m_specs.generation(), m_specs.id(), isNetwork);

    if (m_inputDevice.isNull()) {
        m_btnControl->setIcon(QIcon());
        m_inputLabel->hide();
        emit removeBinding(m_specs.generation(), m_specs.id());
        updateInputMenu();
        return;
    }

    if (!isNetwork) {
        emit addBinding(m_specs.generation(), m_specs.id(), inputDevice);
    }
    emit strategyControlled(m_specs.generation(), m_specs.id(), m_strategyControlled);
    updateInputMenu();
    m_inputLabel->setText(m_inputDevice);
    m_inputLabel->show();
    if (m_inputDevice == "Keyboard") {
        m_btnControl->setIcon(QIcon("icon:16/input-keyboard.png"));
    } else if (isNetwork) {
        m_btnControl->setIcon(QIcon("icon:16/input-network.png"));
    } else {
        m_btnControl->setIcon(QIcon("icon:16/input-gaming.png"));
    }
}

void RobotWidget::updateInputMenu()
{
    m_inputMenu->clear();

    QStringList devices = m_inputManager->devices();
    devices.prepend("Network");
    m_btnControl->setEnabled(!devices.isEmpty());

    QAction *action = m_inputMenu->addAction("Disable manual control");
    connect(action, SIGNAL(triggered()), SLOT(disableInput()));
    m_inputDeviceGroup->addAction(action);
    action->setCheckable(true);
    action->setChecked(m_inputDevice.isEmpty());

    if (!m_isGeneration) {
        QAction *action2 = m_inputMenu->addAction("Forward to strategy");
        connect(action2, SIGNAL(triggered(bool)), SLOT(setStrategyControlled(bool)));
        action2->setCheckable(true);
        action2->setDisabled(m_inputDevice.isEmpty());
        action2->setChecked(m_strategyControlled);

        QAction *ejectAction = m_inputMenu->addAction("Eject sdcard");
        connect(ejectAction, SIGNAL(triggered(bool)), SLOT(sendEject()));
        ejectAction->setEnabled(m_teamId != NoTeam);
    }

    m_inputMenu->addSeparator();
    bool deviceFound = false; // input device may have been removed
    foreach (const QString &device, devices) {
        QAction *action = m_inputMenu->addAction(device);
        action->setData(device);
        connect(action, SIGNAL(triggered()), SLOT(selectInput()));
        m_inputDeviceGroup->addAction(action);
        action->setCheckable(true);
        action->setChecked(device == m_inputDevice);
        if (device == m_inputDevice) {
            deviceFound = true;
        }
    }

    if (!m_inputDevice.isNull() && !deviceFound) { // clear input if device is no longer available
        disableInput();
    }
}

void RobotWidget::sendEject()
{
    emit ejectSdcard(m_specs.generation(), m_specs.id());
}

void RobotWidget::selectTeam(QAction *action)
{
    Team team = (Team) action->data().toInt();
    selectTeam(team);
    emit teamSelected(m_specs.generation(), m_specs.id(), team);
}

void RobotWidget::selectTeam(Team team)
{
    QBrush brush;

    m_teamId = team;
    updateInputMenu();
    m_inputLabel->setEnabled(true);

    switch (team) {
    case NoTeam:
    case SwapTeam:
        brush = QBrush("white");
        m_inputLabel->setEnabled(false);
        break;

    case Blue:
        brush = QBrush("dodgerblue");
        break;

    case Yellow:
        brush = QBrush("yellow");
        break;

    case Mixed:
    case PartialBlue:
    case Select6v6:
    case Select11v11:
        brush = QBrush("dodgerblue");
        break;

    case PartialYellow:
        brush = QBrush("yellow");
        break;
    }

    QAction *action = m_teamGroup->actions().value(team);
    if (action) {
        action->setChecked(true);
    }

    qreal devicePixelRatio = (window() && window()->windowHandle()) ? window()->windowHandle()->devicePixelRatio() : 1.0;
    QPixmap pixmap(32 * devicePixelRatio, 32 * devicePixelRatio);
    pixmap.setDevicePixelRatio(devicePixelRatio);
    pixmap.fill(Qt::transparent);

    QPainter p(&pixmap);
    p.setPen(Qt::black);
    p.setBrush(brush);
    p.drawEllipse(8, 8, 16, 16);
    if (team == Mixed) {
        p.setBrush(QBrush("yellow"));
        p.drawChord(8, 8, 16, 16, 16 * 270, 16 * 180);
    }
    if (team == PartialBlue || team == PartialYellow) {
        p.setBrush(QBrush("white"));
        p.drawChord(8, 8, 16, 16, 16 * 270, 16 * 180);
    }
    p.end();

    m_team->setIcon(pixmap);
}

void RobotWidget::setTeam(uint generation, uint id, Team team)
{
    if (generation == m_specs.generation() && id == m_specs.id()) {
        selectTeam(team);
    }
}

void RobotWidget::setInputDevice(uint generation, uint id, const QString &inputDevice)
{
    if (generation == m_specs.generation() && id == m_specs.id()) {
        selectInput(inputDevice);
    }
}

void RobotWidget::handleResponse(const robot::RadioResponse &response)
{
    // responses are broadcasted to every robot widget, just ignore the wrong ones
    if (response.generation() != m_specs.generation() || response.id() != m_specs.id()) {
        return;
    }

    m_mergedResponse.MergeFrom(response);
    m_guiUpdateTimer->requestTriggering();
}

void RobotWidget::updateBatteryStatus(int percentage)
{
    const int percentageLow = 25;
    const int percentageMid = 50;
    const int percentageFull = 75;
    const int hysteresis = 3;

    int diff = m_lastBatteryLevel - percentage;
    diff = (diff > 0) ? diff : -diff;
    if (diff >= hysteresis) {
        m_batteryEmpty->setVisible(0 <= percentage && percentage < percentageLow);
        m_batteryLow->setVisible(percentageLow <= percentage && percentage < percentageMid);
        m_batteryMid->setVisible(percentageMid <= percentage && percentage < percentageFull);
        m_batteryFull->setVisible(percentageFull <= percentage);
        m_lastBatteryLevel = percentage;
    }

    const QString toolTip = QString("Battery: %1%").arg(QString::number(percentage));
    m_batteryEmpty->setToolTip(toolTip);
    m_batteryLow->setToolTip(toolTip);
    m_batteryMid->setToolTip(toolTip);
    m_batteryFull->setToolTip(toolTip);
}

void RobotWidget::exchangeRobot(uint generation, uint id, bool exchange)
{
    if (generation == m_specs.generation() && id == m_specs.id()) {
        m_exchangeRobot->setVisible(exchange);
        m_exchangeRobotUpdated = true;
        m_exchangeRobotTimer->requestTriggering();
    }
}

void RobotWidget::hideExchangeRobot()
{
    if (!m_exchangeRobotUpdated) {
        m_exchangeRobot->setVisible(false);
    } else {
        m_exchangeRobotTimer->requestTriggering();
    }
    m_exchangeRobotUpdated = false;
}

void RobotWidget::updateRadioStatus(int packetLossRx, int packetLossTx)
{
    const int rxLossOkay = 20;
    const int rxLossGood = 5;
    const int rxLossExcellent = 0;
    const int txLossGood = 90;
    const int txLossExcellent = 50;

    // categorize
    bool rxBad = rxLossOkay < packetLossRx;
    bool rxOkay = rxLossGood < packetLossRx && packetLossRx <= rxLossOkay;
    bool rxGood = rxLossExcellent < packetLossRx && packetLossRx <= rxLossGood;
    bool rxExcellent = 0 <= packetLossRx && packetLossRx <= rxLossExcellent;

    // Loosing radio responses is not too bad
    bool txOkay = txLossGood < packetLossTx;
    bool txGood = txLossExcellent < packetLossTx && packetLossTx <= txLossGood;
    bool txExcellent = 0 <= packetLossTx && packetLossTx <= txLossExcellent;

    // Merge by always using the worst rating
    bool bad = rxBad;
    bool okay = !bad && (rxOkay || txOkay);
    bool good = !okay && !bad && (rxGood || txGood);
    bool excellent = !good && !okay && !bad && (rxExcellent || txExcellent);

    m_rfBad->setVisible(bad);
    m_rfOkay->setVisible(okay);
    m_rfGood->setVisible(good);
    m_rfExcellent->setVisible(excellent);

    const QString rxStr = QString::number(packetLossRx);
    const QString txStr = QString::number(packetLossTx);
    const QString toolTip = QString("Robot commands lost(RX): %1%, Replies lost(TX): %2%").arg(rxStr, txStr);
    m_rfBad->setToolTip(toolTip);
    m_rfOkay->setToolTip(toolTip);
    m_rfGood->setToolTip(toolTip);
    m_rfExcellent->setToolTip(toolTip);
}

void RobotWidget::updateTemperatureStatus(int temperature)
{
    const int tempMid = 35;
    const int tempHigh = 60;
    m_tempMid->setVisible(tempMid <= temperature && temperature < tempHigh);
    m_tempHigh->setVisible(tempHigh <= temperature);

    const QString toolTip =QString("Temperature: %1 °C").arg(temperature);
    m_tempMid->setToolTip(toolTip);
    m_tempHigh->setToolTip(toolTip);
}

void RobotWidget::updateRobotStatus()
{
    if (m_mergedResponse.has_battery() && m_mergedResponse.has_packet_loss_rx() && m_mergedResponse.has_packet_loss_tx()) {
        // smooth and update battery data
        const float alpha = 0.05f;
        if (m_statusCtr == 0) {
            m_smoothedBatteryLevel = m_mergedResponse.battery();
        } else {
            m_smoothedBatteryLevel = alpha * m_mergedResponse.battery() + (1-alpha) * m_smoothedBatteryLevel;
        }
        updateBatteryStatus(std::ceil(m_smoothedBatteryLevel * 100));

        // update radio status if changed
        if (!m_lastResponse.IsInitialized() || m_lastResponse.packet_loss_rx() != m_mergedResponse.packet_loss_rx()
                || m_lastResponse.packet_loss_tx() != m_mergedResponse.packet_loss_tx()) {
            updateRadioStatus(std::ceil(m_mergedResponse.packet_loss_rx() * 100),
                              std::ceil(m_mergedResponse.packet_loss_tx() * 100));
        }
    }

    if (m_mergedResponse.has_cap_charged()) {
        m_capCharged->setVisible(m_mergedResponse.cap_charged());
    }
    if (m_mergedResponse.has_ball_detected()) {
        m_ball->setVisible(m_mergedResponse.ball_detected());
    }
    if (m_mergedResponse.has_extended_error() && m_mergedResponse.extended_error().has_temperature()) {
        updateTemperatureStatus(m_mergedResponse.extended_error().temperature());
    }
//    if (m_mergedResponse.has_error_present()) {
//        m_motorWarning->setVisible(m_mergedResponse.error_present());
//    }
    if (m_mergedResponse.has_extended_error()) {
        const auto &extendedError = m_mergedResponse.extended_error();

        m_motorVLError->setVisible(extendedError.motor_1_error());
        m_motorHLError->setVisible(extendedError.motor_2_error());
        m_motorHRError->setVisible(extendedError.motor_3_error());
        m_motorVRError->setVisible(extendedError.motor_4_error());
        m_motorDribblerError->setVisible(extendedError.dribbler_error());
        m_kickerError->setVisible(extendedError.kicker_error());
        m_breakBeamError->setVisible(extendedError.kicker_break_beam_error());

        QString errorMsg = "";
        if (extendedError.motor_encoder_error()) {
            errorMsg += "One or multiple motors have broken hall sensors\n";
        }
        if (extendedError.main_sensor_error()) {
            errorMsg += "Gyroscope or accelerometer not working\n";
        }
        m_warning->setVisible(!errorMsg.isEmpty());
        m_warning->setToolTip(errorMsg);
    }

    // update counter to indicate status was updated
    m_statusCtr = 11;
    m_guiResponseTimer->requestTriggering();
    m_lastResponse = m_mergedResponse;
    m_mergedResponse.Clear();
}

void RobotWidget::hideRobotStatus()
{
    if (m_statusCtr > 1) {
        // restart timer
        m_guiResponseTimer->requestTriggering();
        m_statusCtr--;
        return;
    }
    updateBatteryStatus(-1);
    updateRadioStatus(-1, -1);
    m_capCharged->hide();
    m_ball->hide();
    updateTemperatureStatus(-100);

    m_motorVLError->hide();
    m_motorHLError->hide();
    m_motorHRError->hide();
    m_motorVRError->hide();
    m_motorDribblerError->hide();
    m_kickerError->hide();
    m_breakBeamError->hide();
    m_warning->hide();

    m_mergedResponse.Clear();
    m_lastResponse.Clear();
}

void RobotWidget::generationChanged(uint generation, RobotWidget::Team team)
{
    if (generation == m_specs.generation()) {
        selectTeam(team);
    }
}
