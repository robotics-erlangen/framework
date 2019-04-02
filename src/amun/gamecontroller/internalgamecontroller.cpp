#include "internalgamecontroller.h"
#include "protobuf/ssl_referee.h"
#include <google/protobuf/descriptor.h>
#include <QDebug>

InternalGameController::InternalGameController(const Timer *timer) :
    m_timer(timer)
{
    m_trigger = new QTimer(this);
    connect(m_trigger, &QTimer::timeout, this, &InternalGameController::sendUpdate);
    m_trigger->start(UPDATE_INTERVAL_MS);

    connect(timer, &Timer::scalingChanged, this, &InternalGameController::setScaling);

    m_packet.set_stage(SSL_Referee::NORMAL_FIRST_HALF);
    m_packet.set_command(SSL_Referee::HALT);
    m_packet.set_command_counter(0);
    m_packet.set_command_timestamp(timer->currentTime());
    teamInfoSetDefault(m_packet.mutable_blue());
    teamInfoSetDefault(m_packet.mutable_yellow());
}

void InternalGameController::sendUpdate()
{
    // update packet
    m_packet.set_packet_timestamp(m_timer->currentTime());
    // TODO: is stage_time_left needed?
    m_packet.set_command_counter(m_packet.command_counter()+1);
    // TODO: set current_action_time_remaining

    // send packet to internal referee
    QByteArray packetData;
    packetData.resize(m_packet.ByteSize());
    if (m_packet.SerializeToArray(packetData.data(), packetData.size())) {
        emit gotPacketForReferee(packetData);
    }
}

void InternalGameController::setScaling(double scaling)
{
    // update scaling as told
    if (scaling <= 0) {
        m_trigger->stop();
    } else {
        const int t = UPDATE_INTERVAL_MS / scaling;
        m_trigger->start(qMax(1, t));
    }
}

void InternalGameController::handleGuiCommand(const QByteArray &data)
{
    SSL_Referee newState;
    newState.ParseFromArray(data.data(), data.size());

    // the ui part of the internal referee will only change command, stage or goalie
    if (newState.command() != m_packet.command() || newState.stage() != m_packet.stage()) {
        // clear all internal state
        // TODO: command_timestamp, command_counter
        m_packet.CopyFrom(newState);
    } else {
        m_packet.mutable_blue()->CopyFrom(newState.blue());
        m_packet.mutable_yellow()->CopyFrom(newState.yellow());
    }

    sendUpdate();
}

void InternalGameController::handleStatus(const Status& status)
{
    if (status->has_geometry()) {
        m_geometry = status->geometry();
    }
}

void InternalGameController::handleCommand(const amun::CommandReferee &refereeCommand)
{
    if (refereeCommand.has_command()) {
        const std::string &c = refereeCommand.command();
        handleGuiCommand(QByteArray(c.data(), c.size()));
    }
}

auto InternalGameController::ballPlacementPosForFoul(Vector foulPosition) -> Vector
{

}

void InternalGameController::handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message)
{
    if (!message->has_game_event()) {
        // TODO: emit reply message
        return;
    }
    const gameController::GameEvent &event = message->game_event();
}
