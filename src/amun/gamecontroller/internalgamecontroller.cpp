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
    if (m_currentActionStartTime > 0) {
        m_packet.set_current_action_time_remaining(m_currentActionAllowedTime - (m_timer->currentTime() - m_currentActionStartTime));
    } else {
        m_packet.clear_current_action_time_remaining();
    }

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
        auto counterBefore = m_packet.command_counter();
        m_packet.CopyFrom(newState);
        m_packet.set_command_timestamp(m_timer->currentTime());
        m_packet.set_command_counter(counterBefore+1);
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

static float sign(float x)
{
    return x < 0 ? -1.0f : 1.0f;
}

void InternalGameController::issueCommand(SSL_Referee::Command command)
{
    m_packet.set_command(command);
    m_packet.set_command_counter(m_packet.command_counter() + 1);
    m_packet.set_command_timestamp(m_timer->currentTime());
    sendUpdate();
}

void InternalGameController::handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message)
{
    if (!message->has_game_event()) {
        // TODO: emit reply message
        return;
    }
    const gameController::GameEvent &event = message->game_event();

    // extract location and team name
    std::string byTeamString;
    Vector eventLocation{0, 0};

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
                    byTeamString = messageRefl->GetEnum(eventMessage, field)->name();
                } else if (fieldName == "location") {
                    const google::protobuf::Message &locationMessage = messageRefl->GetMessage(eventMessage, field);
                    const gameController::Location &location = static_cast<const gameController::Location&>(locationMessage);
                    eventLocation.x = location.x();
                    eventLocation.y = location.y();
                }
            }
        }
    }

    const float FIELD_LINE_DISTANCE = 0.3f;
    const float GOAL_LINE_DISTANCE = 0.35f;

    // TODO: assertions for current state of the game to check the autoref working properly

    Vector placementPos{0, 0};
    bool placingTeamIsYellow = byTeamString == "BLUE";
    bool shouldPlace = false;
    switch (event.type()) {
    case gameController::AIMLESS_KICK:
    case gameController::BALL_LEFT_FIELD_GOAL_LINE:
        placementPos.x = sign(eventLocation.x) * (m_geometry.field_height() / 2.0f - GOAL_LINE_DISTANCE);
        placementPos.y = sign(eventLocation.y) * (m_geometry.field_width() / 2.0f - FIELD_LINE_DISTANCE);
        m_packet.set_next_command(placingTeamIsYellow ? SSL_Referee::DIRECT_FREE_YELLOW : SSL_Referee::DIRECT_FREE_BLUE);
        shouldPlace = true;
        break;

    case gameController::BALL_LEFT_FIELD_TOUCH_LINE:
        placementPos.x = sign(eventLocation.x) * std::min(m_geometry.field_height() / 2.0f - GOAL_LINE_DISTANCE, std::abs(eventLocation.x));
        placementPos.y = sign(eventLocation.y) * std::min(m_geometry.field_width() / 2.0f - FIELD_LINE_DISTANCE, std::abs(eventLocation.y));
        m_packet.set_next_command(placingTeamIsYellow ? SSL_Referee::INDIRECT_FREE_YELLOW : SSL_Referee::INDIRECT_FREE_BLUE);
        shouldPlace = true;
        break;

    case gameController::PLACEMENT_SUCCEEDED:
    {
        shouldPlace = false;
        if (m_packet.next_command() != SSL_Referee::FORCE_START) {
            m_currentActionStartTime = m_timer->currentTime();
            m_currentActionAllowedTime = 5000000;
        }
        SSL_Referee::Command command = m_packet.next_command();
        m_packet.clear_next_command();
        issueCommand(command);
        break;
    }
    }
    // TODO: set current action start time to something negative if it is not needed
    // TODO: clear next command when it is not needed
    if (shouldPlace) {
        m_packet.mutable_designated_position()->set_x(placementPos.x * 1000.0f);
        m_packet.mutable_designated_position()->set_y(placementPos.y * 1000.0f);
        m_currentActionStartTime = m_timer->currentTime();
        m_currentActionAllowedTime = 30000000;
        issueCommand(placingTeamIsYellow ? SSL_Referee::BALL_PLACEMENT_YELLOW : SSL_Referee::BALL_PLACEMENT_BLUE);
    }
}
