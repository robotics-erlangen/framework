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
#include "input/inputmanager.h"
#include "guitimer.h"
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
    m_inputManager(inputManager),
    m_isGeneration(is_generation),
    m_strategyControlled(false),
    m_statusCtr(0)
{
    if (!is_generation) {
        connect(this, SIGNAL(addBinding(uint,uint,QString)), inputManager, SLOT(addBinding(uint,uint,QString)));
        connect(this, SIGNAL(removeBinding(uint,uint)), inputManager, SLOT(removeBinding(uint,uint)));
        connect(this, SIGNAL(strategyControlled(uint,uint,bool)), inputManager, SLOT(setStrategyControlled(uint,uint,bool)));
        connect(this, SIGNAL(networkControlled(uint,uint,bool)), inputManager, SLOT(setNetworkControlled(uint,uint,bool)));
        connect(this, SIGNAL(ejectSdcard(uint,uint)), inputManager, SLOT(setEjectSdcard(uint,uint)));
    }
    connect(inputManager, SIGNAL(devicesUpdated()), SLOT(updateMenu()));

    QHBoxLayout *layout = new QHBoxLayout(this);
    layout->setMargin(0);
    layout->setSpacing(3);

    m_teamMenu = new QMenu(this);
    m_teamGroup = new QActionGroup(this);

    QAction *action;

    action = m_teamMenu->addAction("No team");
    action->setData(NoTeam);
    if (!is_generation) {
        action->setCheckable(true);
        m_teamGroup->addAction(action);
    }

    action = m_teamMenu->addAction("Blue");
    action->setData(Blue);
    if (!is_generation) {
        action->setCheckable(true);
        m_teamGroup->addAction(action);
    }

    action = m_teamMenu->addAction("Yellow");
    action->setData(Yellow);
    if (!is_generation) {
        action->setCheckable(true);
        m_teamGroup->addAction(action);
    }

    if (is_generation) {
        // partial blue and yellow only set the first half of the robots
        action = m_teamMenu->addAction("Half Blue");
        action->setData(PartialBlue);
        action = m_teamMenu->addAction("Half Yellow");
        action->setData(PartialYellow);
    }

    connect(m_teamMenu, SIGNAL(triggered(QAction*)), SLOT(selectTeam(QAction*)));

    m_team = new QToolButton;
    m_team->setAutoRaise(true);
    m_team->setPopupMode(QToolButton::InstantPopup);
    m_team->setMenu(m_teamMenu);
    layout->addWidget(m_team);

    m_label = new QLabel;
    layout->addWidget(m_label);

    m_battery = new QLabel;
    m_battery->hide();
    layout->addWidget(m_battery);

    layout->addStretch(1);

    if (!m_isGeneration) {
        // tightly pack icons
        QLayout *iconLayout = new QHBoxLayout;
        iconLayout->setMargin(0);
        iconLayout->setSpacing(0);

        // indicates presence of radio responses
        m_radio = new QLabel;
        m_radio->setText("R");
        m_radio->setPixmap(QIcon("icon:32/network-wireless.png").pixmap(16, 16));
        m_radio->hide();
        iconLayout->addWidget(m_radio);

        // used to display lost packets
        m_radioErrors = new QLabel;
        m_radioErrors->hide();
        iconLayout->addWidget(m_radioErrors);

        m_ball = new QLabel;
        m_ball->setText("b");
        m_ball->setPixmap(QIcon("icon:16/ball.png").pixmap(16, 16));
        m_ball->setToolTip("Ball detected");
        m_ball->hide();
        iconLayout->addWidget(m_ball);

        m_motorWarning = new QLabel;
        m_motorWarning->setText("!");
        m_motorWarning->setPixmap(QIcon("icon:16/dialog-warning.png").pixmap(16, 16));
        m_motorWarning->setToolTip("Motor in current limitation! Check immediatelly");
        m_motorWarning->hide();
        iconLayout->addWidget(m_motorWarning);

        m_capCharged = new QLabel;
        m_capCharged->setText("c");
        m_capCharged->setPixmap(QIcon("icon:16/capacitor.png").pixmap(16, 16));
        m_capCharged->setToolTip("Capacitor charged");
        m_capCharged->hide();
        iconLayout->addWidget(m_capCharged);

        layout->addLayout(iconLayout);
    }

    m_inputLabel = new QLabel;
    m_inputLabel->hide();
    layout->addWidget(m_inputLabel);

    m_inputDeviceGroup = new QActionGroup(this);
    m_menu = new QMenu(this);

    m_btnControl = new QToolButton;
    m_btnControl->setMenu(m_menu);
    m_btnControl->setAutoRaise(true);
    m_btnControl->setPopupMode(QToolButton::InstantPopup);
    layout->addWidget(m_btnControl);
    updateMenu();
    if (!m_isGeneration) {
        disableInput();
    }

    selectTeam(NoTeam);

    m_guiUpdateTimer = new GuiTimer(100, this);
    connect(m_guiUpdateTimer, &GuiTimer::timeout, this, &RobotWidget::updateRobotStatus);

    m_guiResponseTimer = new GuiTimer(1000, this);
    connect(m_guiResponseTimer, &GuiTimer::timeout, this, &RobotWidget::hideRobotStatus);
}

RobotWidget::~RobotWidget()
{
    emit removeBinding(m_specs.generation(), m_specs.id());
}

void RobotWidget::setSpecs(const robot::Specs &specs)
{
    m_specs = specs;
    if (m_isGeneration) {
        m_label->setText(QString("Generation %1").arg(specs.year()));
    } else {
        m_label->setText(QString("%1").arg(specs.id()));
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
    selectInput(action->text());
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
        updateMenu();
        return;
    }

    if (!isNetwork) {
        emit addBinding(m_specs.generation(), m_specs.id(), inputDevice);
    }
    emit strategyControlled(m_specs.generation(), m_specs.id(), m_strategyControlled);
    updateMenu();
    m_inputLabel->setText(m_inputDevice);
    m_inputLabel->show();
    if (m_inputDevice == "Keyboard") {
        m_btnControl->setIcon(QIcon("icon:16/input-keyboard.png"));
    } else if (isNetwork) {
        m_btnControl->setIcon(QIcon("icon:16/network-receive.png"));
    } else {
        m_btnControl->setIcon(QIcon("icon:16/input-gaming.png"));
    }
}

void RobotWidget::updateMenu()
{
    m_menu->clear();

    QStringList devices = m_inputManager->devices();
    devices.prepend("Network");
    m_btnControl->setEnabled(!devices.isEmpty());

    QAction *action = m_menu->addAction("Disable manual control");
    connect(action, SIGNAL(triggered()), SLOT(disableInput()));
    m_inputDeviceGroup->addAction(action);
    action->setCheckable(true);
    action->setChecked(m_inputDevice.isEmpty());

    if (!m_isGeneration) {
        QAction *action2 = m_menu->addAction("Forward to strategy");
        connect(action2, SIGNAL(triggered(bool)), SLOT(setStrategyControlled(bool)));
        action2->setCheckable(true);
        action2->setDisabled(m_inputDevice.isEmpty());
        action2->setChecked(m_strategyControlled);

        QAction *ejectAction = m_menu->addAction("Eject sdcard");
        connect(ejectAction, SIGNAL(triggered(bool)), SLOT(sendEject()));
        ejectAction->setEnabled(m_teamId != NoTeam);
    }

    m_menu->addSeparator();
    bool deviceFound = false; // input device may have been removed
    foreach (const QString &device, devices) {
        QAction *action = m_menu->addAction(device);
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
    updateMenu();
    m_inputLabel->setEnabled(true);

    switch (team) {
    case NoTeam:
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

void RobotWidget::hideRobotStatus()
{
    if (m_statusCtr > 0) {
        // restart timer
        m_guiResponseTimer->requestTriggering();
        m_statusCtr--;
        return;
    }
    m_battery->hide();
    m_radio->hide();
    m_radioErrors->hide();
    m_ball->hide();
    m_motorWarning->hide();
    m_capCharged->hide();
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

void RobotWidget::updateRobotStatus()
{
    if (m_mergedResponse.has_battery() && m_mergedResponse.has_packet_loss_rx() && m_mergedResponse.has_packet_loss_tx()) {
        // update battery status if changed
        if (!m_lastResponse.IsInitialized() || m_lastResponse.battery() != m_mergedResponse.battery()) {
            // battery status
            m_battery->setText(QString("B:%1%").arg(
                    QString::number((int)std::ceil(m_mergedResponse.battery() * 100)) ) );
        }
        m_battery->show();

        // update radio status if changed
        if (!m_lastResponse.IsInitialized() || m_lastResponse.packet_loss_rx() != m_mergedResponse.packet_loss_rx()
                || m_lastResponse.packet_loss_tx() != m_mergedResponse.packet_loss_tx()) {
            const QString rxStr = QString::number((int)std::ceil(m_mergedResponse.packet_loss_rx() * 100));
            const QString txStr = QString::number((int)std::ceil(m_mergedResponse.packet_loss_tx() * 100));
            // radio status, errors are only display if any show up
            const QString toolTip = QString("R:%1%, T:%2%").arg(rxStr, txStr);
            m_radio->setToolTip(toolTip);
            m_radioErrors->setToolTip(toolTip);

            QString radioError;
            if (m_mergedResponse.packet_loss_rx() > 0) {
                radioError = QString("R:%1%").arg(rxStr);
            }
            if (m_mergedResponse.packet_loss_tx() > 0) {
                if (!radioError.isEmpty()) {
                    radioError += ", ";
                }
                radioError += QString("T:%1%").arg(txStr);
            }
            m_radioErrors->setText(radioError);
        }
        m_radio->show();
        m_radioErrors->setVisible(m_mergedResponse.packet_loss_rx() > 0 || m_mergedResponse.packet_loss_tx() > 0);
    }

    if (m_mergedResponse.has_ball_detected()) {
        m_ball->setVisible(m_mergedResponse.ball_detected());
    }
    if (m_mergedResponse.has_error_present()) {
        m_motorWarning->setVisible(m_mergedResponse.error_present());
    }
    if (m_mergedResponse.has_extended_error()) {
        QString errorMsg = "";
        const QString motorXPowerLimit = "Motor %1 in power limit\n";
        if (m_mergedResponse.extended_error().motor_1_error()) {
            errorMsg += motorXPowerLimit.arg(1);
        }
        if (m_mergedResponse.extended_error().motor_2_error()) {
            errorMsg += motorXPowerLimit.arg(2);
        }
        if (m_mergedResponse.extended_error().motor_3_error()) {
            errorMsg += motorXPowerLimit.arg(3);
        }
        if (m_mergedResponse.extended_error().motor_4_error()) {
            errorMsg += motorXPowerLimit.arg(4);
        }
        if (m_mergedResponse.extended_error().dribbler_error()) {
            errorMsg += motorXPowerLimit.arg("dribbler");
        }
        if (m_mergedResponse.extended_error().kicker_error()) {
            errorMsg += "Kicker error!";
        }
        m_motorWarning->setToolTip(errorMsg);
    }
    if (m_mergedResponse.has_extended_error() && m_mergedResponse.extended_error().has_temperature()) {
        m_battery->setToolTip(QString("Temperature: %1 °C").arg(m_mergedResponse.extended_error().temperature()));
    }
    if (m_mergedResponse.has_cap_charged()) {
        m_capCharged->setVisible(m_mergedResponse.cap_charged());
    }

    // update counter to indicate status was updated
    m_statusCtr = 10;
    m_guiResponseTimer->requestTriggering();
    m_lastResponse = m_mergedResponse;
    m_mergedResponse.Clear();
}

void RobotWidget::generationChanged(uint generation, RobotWidget::Team team)
{
    if (generation == m_specs.generation()) {
        selectTeam(team);
    }
}
