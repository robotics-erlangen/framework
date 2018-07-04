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

#include <map>

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

QString RefereeStatusWidget::formatTime(int time)
{
    return QString("(%1%2:%3)")
            .arg(time < 0 ? "-" : "")
            .arg(std::abs(time) / 60, 2, 10, QChar('0'))
            .arg(std::abs(time) % 60, 2, 10, QChar('0'));
}

QString RefereeStatusWidget::gameEventMessage(const SSL_Referee_Game_Event &event)
{
    std::map<SSL_Referee_Game_Event_GameEventType, QString> eventTypeFormatString =
        {{SSL_Referee_Game_Event::UNKNOWN, "%1%2"},
         {SSL_Referee_Game_Event::CUSTOM, "%2 by %1"},
         {SSL_Referee_Game_Event::NUMBER_OF_PLAYERS, "%1 team has too many players%2"},
         {SSL_Referee_Game_Event::BALL_LEFT_FIELD, "ball left field, shot by %1%2"},
         {SSL_Referee_Game_Event::GOAL, "goal by %1%2"},
         {SSL_Referee_Game_Event::KICK_TIMEOUT, "kick timeout by %1%2"},
         {SSL_Referee_Game_Event::NO_PROGRESS_IN_GAME, "no progress in game%1%2"},
         {SSL_Referee_Game_Event::BOT_COLLISION, "bot collision/pushing by %1%2"},
         {SSL_Referee_Game_Event::ATTACKER_IN_DEFENSE_AREA, "%1 touched the ball in the opponent defense area%2"},
         {SSL_Referee_Game_Event::ICING, "icing, shot by %1%2"},
         {SSL_Referee_Game_Event::BALL_SPEED, "ball too fast, shot by %1%2"},
         {SSL_Referee_Game_Event::ROBOT_STOP_SPEED, "%1 was too fast during stop%2"},
         {SSL_Referee_Game_Event::BALL_DRIBBLING, "%1 dribbled the ball too far%2"},
         {SSL_Referee_Game_Event::ATTACKER_TOUCH_KEEPER, "%1 touched the opponent keeper%2"},
         {SSL_Referee_Game_Event::DOUBLE_TOUCH, "double touch by %1%2"},
         {SSL_Referee_Game_Event::ATTACKER_TO_DEFENCE_AREA, "%1 did not hold distance to opponent defense area%2"},
         {SSL_Referee_Game_Event::DEFENDER_TO_KICK_POINT_DISTANCE, "%1 was too close too kick point%2"},
         {SSL_Referee_Game_Event::BALL_HOLDING, "ball holding by %1%2"},
         {SSL_Referee_Game_Event::INDIRECT_GOAL, "indirect goal, shot by %1%2"},
         {SSL_Referee_Game_Event::BALL_PLACEMENT_FAILED, "%1 ball placement failed%2"},
         {SSL_Referee_Game_Event::CHIP_ON_GOAL, "%1 shot a chip goal%2"}};

    QString originatorString;
    if (event.has_originator()) {
        auto originator = event.originator();
        QString teamColor;
        switch (originator.team()) {
        case SSL_Referee_Game_Event_Team_TEAM_UNKNOWN:
            teamColor = "unknown";
            break;
        case SSL_Referee_Game_Event_Team_TEAM_BLUE:
            teamColor = "blue";
            break;
        case SSL_Referee_Game_Event_Team_TEAM_YELLOW:
            teamColor = "yellow";
            break;
        }
        if (originator.has_botid()) {
            originatorString = teamColor + " " + QString::number(originator.botid());
        } else {
            originatorString = teamColor;
        }
    }
    QString message;
    if (event.has_message()) {
        message = ": " + QString::fromStdString(event.message());
    }
    return QString(eventTypeFormatString[event.gameeventtype()]).arg(originatorString).arg(message);
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

        ui->refereePhase->setText(QString("%1 %2 %5Goals: %3:%4")
                .arg(QString::fromStdString(SSL_Referee::Stage_Name(stage)))
                .arg(formatTime(timeRemaining))
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
            timeout = formatTime(timeoutLeft);
        }

        if (game_state.has_game_event()) {
            QString text = gameEventMessage(game_state.game_event());
            ui->gameEvent->setText(text);
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
