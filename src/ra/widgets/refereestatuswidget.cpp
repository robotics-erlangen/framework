/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#include "refereestatuswidget.h"
#include "protobuf/gamestate.pb.h"

#include "ui_refereestatuswidget.h"

RefereeStatusWidget::RefereeStatusWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::RefereeStatusWidget)
{
    ui->setupUi(this);
}

RefereeStatusWidget::~RefereeStatusWidget()
{
    delete ui;
}

void RefereeStatusWidget::handleStatus(const Status &status)
{
    if (status->has_game_state()) {
        const amun::GameState &game_state = status->game_state();
        const SSL_Referee::Stage stage = game_state.stage();
        const int timeRemaining = game_state.stage_time_left() / 1000000;

        QString teamNames = "";
        if (game_state.yellow().name().size() > 0 || game_state.blue().name().size() > 0) {
            teamNames = QString("%1 vs. %2 ").arg(QString::fromStdString(game_state.yellow().name()),
                                                  QString::fromStdString(game_state.blue().name()));
        }

        ui->refereePhase->setText(QString("%1 (%2:%3) %6Goals: %4:%5")
                .arg(QString::fromStdString(SSL_Referee::Stage_Name(stage)))
                .arg(timeRemaining / 60, 2, 10, QChar('0'))
                .arg(timeRemaining % 60, 2, 10, QChar('0'))
                .arg(game_state.yellow().score()).arg(game_state.blue().score())
                .arg(teamNames));

        const amun::GameState::State state = game_state.state();
        QString timeout = "";
        if (state == amun::GameState::TimeoutBlue || state == amun::GameState::TimeoutYellow) {
            int timeoutLeft;
            if (state == amun::GameState::TimeoutBlue) {
                timeoutLeft = game_state.blue().timeout_time() / 1000000;
            } else {
                timeoutLeft = game_state.yellow().timeout_time() / 1000000;
            }
            timeout = QString("(%1:%2)")
                    .arg(timeoutLeft / 60, 2, 10, QChar('0'))
                    .arg(timeoutLeft % 60, 2, 10, QChar('0'));
        }

        ui->refereeState->setText(QString::fromStdString(game_state.State_Name(state)) + timeout);

        QString ss;
        switch (state) {
        case amun::GameState::Halt:
            ss = "QLabel { color: red; font-weight: bold; }";
            break;

        default:
            ss = "QLabel { font-weight: bold; }";
        }

        if (ss != ui->refereeState->styleSheet()) {
            ui->refereeState->setStyleSheet(ss);
        }
    }
}
