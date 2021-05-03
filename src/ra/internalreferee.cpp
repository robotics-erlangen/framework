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

#include "internalreferee.h"
#include "protobuf/ssl_referee.h"

InternalReferee::InternalReferee(QObject *parent) :
    QObject(parent)
{
    // referee packet uses mircoseconds, not nanoseconds
    // timestamp is not set as this would require the current strategy time to have any meaning
    m_referee.set_packet_timestamp(0);
    m_referee.set_stage(SSL_Referee::NORMAL_FIRST_HALF);
    m_referee.set_stage_time_left(0);
    m_referee.set_command(SSL_Referee::HALT);
    // use high values that do not conflict with the GC command counter
    m_referee.set_command_counter(12345); // !!! is used as delta value by internal referee !!!
    m_referee.set_command_timestamp(0);
    m_referee.set_blueteamonpositivehalf(true);
    teamInfoSetDefault(m_referee.mutable_yellow());
    teamInfoSetDefault(m_referee.mutable_blue());

    assert(m_referee.IsInitialized());
}

void InternalReferee::sendRefereePacket() {
    m_referee.set_packet_timestamp(0);
    assert(m_referee.IsInitialized());

    std::string referee;
    if (m_referee.SerializeToString(&referee)) {
        Command command(new amun::Command);
        command->mutable_referee()->set_command(referee);
        emit sendCommand(command);
    }
}

void InternalReferee::enableInternalAutoref(bool enable)
{
    Command command(new amun::Command);
    command->mutable_referee()->set_use_internal_autoref(enable);
    emit sendCommand(command);
}

void InternalReferee::changeCommand(SSL_Referee::Command command) {
    m_referee.set_command(command);
    m_referee.set_command_timestamp(0);
    m_referee.set_command_counter(m_referee.command_counter() + 1);
    sendRefereePacket();
}

void InternalReferee::changeStage(SSL_Referee::Stage stage) {
    m_referee.set_stage(stage);
    sendRefereePacket();
}

void InternalReferee::changeYellowKeeper(uint id) {
    m_referee.mutable_yellow()->set_goalie(id);
    sendRefereePacket();
}

void InternalReferee::changeBlueKeeper(uint id) {
    m_referee.mutable_blue()->set_goalie(id);
    sendRefereePacket();
}

void InternalReferee::handleStatus(const Status &status)
{
    if (status->has_game_state()) {
        const amun::GameState &state = status->game_state();
        // update referee information
        m_referee.set_stage(state.stage());
        m_referee.mutable_yellow()->CopyFrom(state.yellow());
        m_referee.mutable_blue()->CopyFrom(state.blue());
        // don't copy command as it is only updated when changeCommand is used

        checkYellowCards(status);
        m_lastStatusTime = status->time();
    }
}

void InternalReferee::setSidesFlipped(bool flipped)
{
    m_referee.set_blueteamonpositivehalf(!flipped);
    sendRefereePacket();
}

void InternalReferee::setYellowCard(int forTeamYellow)
{
    if (forTeamYellow) {
        ++m_yellowCardsYellow;
    } else {
        ++m_yellowCardsBlue;
    }
}

void InternalReferee::checkYellowCards(const Status &status)
{
    if (m_yellowCardsYellow > m_referee.yellow().yellow_cards()) {
        m_referee.mutable_yellow()->set_yellow_cards(m_referee.yellow().yellow_cards() + 1);
        m_referee.mutable_yellow()->add_yellow_card_times(120E6); // 2min in microseconds
    }

    if (m_yellowCardsBlue > m_referee.blue().yellow_cards()){
        m_referee.mutable_blue()->set_yellow_cards(m_referee.blue().yellow_cards() + 1);
        m_referee.mutable_blue()->add_yellow_card_times(120E6); // 2min in microseconds
    }

    if (m_yellowCardsBlue > 0 || m_yellowCardsYellow > 0) {
        adjustCardTimer(status->time());
    }
}

static void adjustCardTimerForOneTeam(SSL_Referee::TeamInfo *status, uint32_t deltaTime, uint8_t &yellowCardCounter)
{
    for (int i = 0; i < status->yellow_card_times_size(); ++i) {
        uint32_t currentTime = status->yellow_card_times(i);
        status->set_yellow_card_times(i, currentTime - std::min(currentTime, deltaTime));
    }

    while (status->yellow_card_times_size() > 0 && status->yellow_card_times(0) == 0) {
        --yellowCardCounter;
        status->set_yellow_cards(status->yellow_cards()-1);
        status->mutable_yellow_card_times()->erase(status->yellow_card_times().begin());
    }
}

void InternalReferee::adjustCardTimer(uint64_t statusTime)
{
    uint32_t deltaTime = static_cast<uint32_t>((statusTime - m_lastStatusTime)/1E3);
    m_lastStatusTime = statusTime;

    adjustCardTimerForOneTeam(m_referee.mutable_blue(), deltaTime, m_yellowCardsBlue);
    adjustCardTimerForOneTeam(m_referee.mutable_yellow(), deltaTime, m_yellowCardsYellow);
    sendRefereePacket();
}
