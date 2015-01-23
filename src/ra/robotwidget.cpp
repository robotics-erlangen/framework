/***************************************************************************
 *   Copyright 2014 Michael Bleier, Michael Eischer, Philipp Nordhus       *
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
    m_strategyControlled(false)
{
    if (!is_generation) {
        connect(this, SIGNAL(addBinding(uint,uint,QString)), inputManager, SLOT(addBinding(uint,uint,QString)));
        connect(this, SIGNAL(removeBinding(uint,uint)), inputManager, SLOT(removeBinding(uint,uint)));
        connect(this, SIGNAL(strategyControlled(uint,uint,bool)), inputManager, SLOT(setStrategyControlled(uint,uint,bool)));
        connect(inputManager, SIGNAL(devicesUpdated()), SLOT(updateMenu()));
    }

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

    if (!m_isGeneration) {
        m_btnControl = new QToolButton;
        m_btnControl->setMenu(m_menu);
        m_btnControl->setAutoRaise(true);
        m_btnControl->setPopupMode(QToolButton::InstantPopup);
        layout->addWidget(m_btnControl);
        updateMenu();
        disableInput();
    }

    selectTeam(NoTeam);

    m_responseTimer = new QTimer(this);
    connect(m_responseTimer, SIGNAL(timeout()), this, SLOT(hideRobotStatus()));
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
    m_inputDevice = action->text();
    emit addBinding(m_specs.generation(), m_specs.id(), action->text());
    emit strategyControlled(m_specs.generation(), m_specs.id(), m_strategyControlled);
    updateMenu();
    m_inputLabel->setText(m_inputDevice);
    m_inputLabel->show();
    if (m_inputDevice == "Keyboard")
        m_btnControl->setIcon(QIcon("icon:16/input-keyboard.png"));
    else
        m_btnControl->setIcon(QIcon("icon:16/input-gaming.png"));
}

void RobotWidget::disableInput()
{
    m_btnControl->setIcon(QIcon());
    m_inputDevice = QString();
    m_inputLabel->hide();
    emit removeBinding(m_specs.generation(), m_specs.id());
    updateMenu();
}

void RobotWidget::updateMenu()
{
    m_menu->clear();

    const QStringList devices = m_inputManager->devices();
    m_btnControl->setEnabled(!devices.isEmpty());

    QAction *action = m_menu->addAction("Disable manual control");
    connect(action, SIGNAL(triggered()), SLOT(disableInput()));
    m_inputDeviceGroup->addAction(action);
    action->setCheckable(true);
    action->setChecked(m_inputDevice.isEmpty());

    QAction *action2 = m_menu->addAction("Forward to strategy");
    connect(action2, SIGNAL(triggered(bool)), SLOT(setStrategyControlled(bool)));
    action2->setCheckable(true);
    action2->setDisabled(m_inputDevice.isEmpty());
    action2->setChecked(m_strategyControlled);

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

void RobotWidget::selectTeam(QAction *action)
{
    Team team = (Team) action->data().toInt();
    selectTeam(team);
    emit teamSelected(m_specs.generation(), m_specs.id(), team);
}

void RobotWidget::selectTeam(Team team)
{
    QBrush brush;

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

void RobotWidget::hideRobotStatus()
{
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

    // just check the flags that are always present
    if (response.has_battery() && response.has_packet_loss_rx() && response.has_packet_loss_tx()) {
        // battery status
        m_battery->setText(QString("B:%1%").arg(
                QString::number((int)std::ceil(response.battery() * 100)) ) );
        m_battery->show();

        // radio status, errors are only display if any show up
        m_radio->setToolTip(QString("R:%1%, T:%2%").arg(
                QString::number((int)std::ceil(response.packet_loss_rx() * 100)),
                QString::number((int)std::ceil(response.packet_loss_tx() * 100)) ) );
        m_radio->show();
        m_radioErrors->setToolTip(m_radio->toolTip());
        QString radioError;
        if (response.packet_loss_rx() > 0) {
            radioError = QString("R:%1%").arg(QString::number((int)std::ceil(response.packet_loss_rx() * 100)));
        }
        if (response.packet_loss_tx() > 0) {
            if (!radioError.isEmpty()) {
                radioError += ", ";
            }
            radioError += QString("T:%1%").arg(QString::number((int)std::ceil(response.packet_loss_tx() * 100)));
        }
        if (radioError.isEmpty()) {
            m_radioErrors->hide();
        } else {
            m_radioErrors->setText(radioError);
            m_radioErrors->show();
        }

        m_ball->setVisible(response.ball_detected());
        m_motorWarning->setVisible(response.motor_in_power_limit());
        m_capCharged->setVisible(response.cap_charged());

        // timer to remove the robot status after not receiving anything for 250ms
        m_responseTimer->stop();
        m_responseTimer->start(250);
    }
}

void RobotWidget::generationChanged(uint generation, RobotWidget::Team team)
{
    if (generation == m_specs.generation()) {
        selectTeam(team);
    }
}
