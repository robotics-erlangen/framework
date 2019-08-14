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

QString RefereeStatusWidget::gameEvent2019Message(const gameController::GameEvent &event)
{
    QString autorefsString;
    if (event.origin_size() > 0) {
        autorefsString = "[";
        for (const auto &ref : event.origin()) {
            autorefsString += QString::fromStdString(ref);
        }
        autorefsString += "]";

    }
    if (event.has_bot_crash_unique()) {
        const auto &e = event.bot_crash_unique();
        return QString("%1 %2 crashed into %3 %4 %5").arg(e.by_team() == gameController::BLUE ? "blue" : "yellow")
                .arg(e.violator()).arg(e.by_team() == gameController::BLUE ? "yellow" : "blue").arg(e.victim()).arg(autorefsString);
    }
    QString byTeamString = "unknown", kickingTeamString = "unknown";
    unsigned int botId = 99;

    const google::protobuf::Reflection *refl = event.GetReflection();
    const google::protobuf::Descriptor *desc = gameController::GameEvent::descriptor();
    // extract fields using reflection
    for (int i = 0; i < desc->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = desc->field(i);
        if (field->name() == "type" || field->name() == "origin") {
            // ignore them as they are not events
            continue;
        }
        if (refl->HasField(event, field)) {
            const google::protobuf::Message &eventMessage = refl->GetMessage(event, field);
            const google::protobuf::Reflection *messageRefl = eventMessage.GetReflection();
            const google::protobuf::Descriptor *messageDesc = eventMessage.GetDescriptor();

            for (int b = 0;b < messageDesc->field_count(); b++) {
                const google::protobuf::FieldDescriptor *field = messageDesc->field(b);
                std::string fieldName = field->name();
                if (fieldName == "by_team") {
                    byTeamString = QString::fromStdString(messageRefl->GetEnum(eventMessage, field)->name()).toLower();
                } else if (fieldName == "by_bot") {
                    botId = messageRefl->GetUInt32(eventMessage, field);
                } else if (fieldName == "kicking_team") {
                    kickingTeamString = QString::fromStdString(messageRefl->GetEnum(eventMessage, field)->name()).toLower();
                } else if (fieldName == "kicking_bot") {
                    botId = messageRefl->GetUInt32(eventMessage, field);
                }
            }
        }
    }

    std::map<gameController::GameEventType, QString> eventTypeFormatString =
        {{gameController::UNKNOWN_GAME_EVENT_TYPE, "unknown"},
         {gameController::PREPARED, "normal start, teams are prepared"},
         {gameController::PLACEMENT_FAILED, "placement failure by %1"},
         {gameController::PLACEMENT_SUCCEEDED, "%1 team successfully placed the ball"},
         {gameController::BOT_SUBSTITUTION, "%1 bot substitution"},
         {gameController::TOO_MANY_ROBOTS, "%1 team has too many robots"},
         {gameController::BALL_LEFT_FIELD_TOUCH_LINE, "ball left field (touch line), shot by %1 %2"},
         {gameController::BALL_LEFT_FIELD_GOAL_LINE, "ball left field (goal line), shot by %1 %2"},
         {gameController::POSSIBLE_GOAL, "possible goal for %1, shot by %3 %2"},
         {gameController::GOAL, "goal for %1, shot by %3 %2"},
         {gameController::INDIRECT_GOAL, "indirect goal by %1"},
         {gameController::CHIPPED_GOAL, "chip goal by %1 %2"},
         {gameController::AIMLESS_KICK, "aimless kick by %1 %2"},
         {gameController::KICK_TIMEOUT, "kick timeout for %1 team"},
         {gameController::KEEPER_HELD_BALL, "%1 keeper held the ball too long"},
         {gameController::ATTACKER_DOUBLE_TOUCHED_BALL, "double touch by %1 %2"},
         {gameController::ATTACKER_TOUCHED_BALL_IN_DEFENSE_AREA, "%1 %2 touched the ball in the opponent defense area"},
         {gameController::ATTACKER_TOUCHED_OPPONENT_IN_DEFENSE_AREA, "%1 %2 touched an opponent robot in its defense area"},
         {gameController::ATTACKER_TOUCHED_OPPONENT_IN_DEFENSE_AREA_SKIPPED, "skipped: %1 %2  touched an opponent robot in its deffense area"},
         {gameController::BOT_DRIBBLED_BALL_TOO_FAR, "%1 %2 dribbeled the ball too far"},
         {gameController::BOT_KICKED_BALL_TOO_FAST, "%1 %2 kicked the ball too fast"},
         {gameController::ATTACKER_TOO_CLOSE_TO_DEFENSE_AREA, "%1 %2 too close to opponent defense area"},
         {gameController::BOT_INTERFERED_PLACEMENT, "%1 %2 interferred ball placement"},
         {gameController::BOT_CRASH_DRAWN, "bot crash drawn"},
         {gameController::BOT_CRASH_UNIQUE, "a %1 robot crashed into an opponent"},
         {gameController::BOT_CRASH_UNIQUE_SKIPPED, "skipped: a %1 robot crashed into an opponent"},
         {gameController::BOT_PUSHED_BOT, "a %1 robot pushed an opponent"},
         {gameController::BOT_PUSHED_BOT_SKIPPED, "skipped: a %1 robot pushed an opponent"},
         {gameController::BOT_HELD_BALL_DELIBERATELY, "%1 %2 held the ball"},
         {gameController::BOT_TIPPED_OVER, "a %1 robot tipped over"},
         {gameController::BOT_TOO_FAST_IN_STOP, "%1 %2 was too fast in stop"},
         {gameController::DEFENDER_TOO_CLOSE_TO_KICK_POINT, "%1 %2 too close to kick point"},
         {gameController::DEFENDER_IN_DEFENSE_AREA_PARTIALLY, "%1 %2 touched the ball while partially in its defense area"},
         {gameController::DEFENDER_IN_DEFENSE_AREA, "1 %2 touched the ball while fully in its defense area"},
         {gameController::MULTIPLE_CARDS, "multiple cards for %1"},
         {gameController::MULTIPLE_PLACEMENT_FAILURES, "multiple placement failures by %1"},
         {gameController::MULTIPLE_FOULS, "multiple fouls by %1"},
         {gameController::UNSPORTING_BEHAVIOR_MINOR, "minor unsporting behavior by %1"},
         {gameController::UNSPORTING_BEHAVIOR_MAJOR, "major unsporting behavior by %1"}};

    QString result = eventTypeFormatString[event.type()];
    if (result.contains('%')) {
        result = result.arg(byTeamString);
    }
    if (result.contains('%')) {
        result = result.arg(botId);
    }
    if (result.contains('%')) {
        result = result.arg(kickingTeamString);
    }
    return result + " " + autorefsString;
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
            teamNames = QString("<font color=\"Yellow\">&#x265F;</font>%1 vs. <font color=\"Blue\">&#x265F;</font>%2 ").arg(QString::fromStdString(game_state.yellow().name()),
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

        if (game_state.has_game_event_2019()) {
            QString text = gameEvent2019Message(game_state.game_event_2019());
            ui->gameEvent->setText(text);
        } else if (game_state.has_game_event()) {
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
