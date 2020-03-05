#include "internalgamecontroller.h"
#include "protobuf/ssl_referee.h"
#include <google/protobuf/descriptor.h>
#include <QDebug>
#include <cmath>

InternalGameController::InternalGameController(const Timer *timer, QObject *parent) :
    QObject(parent),
    m_timer(timer)
{
    m_trigger = new QTimer(this);
    connect(m_trigger, &QTimer::timeout, this, &InternalGameController::sendUpdate);
    m_trigger->start(UPDATE_INTERVAL_MS);

    connect(timer, &Timer::scalingChanged, this, &InternalGameController::setScaling);

    m_packet.set_stage(SSL_Referee::NORMAL_FIRST_HALF);
    m_packet.set_command(SSL_Referee::HALT);
    m_packet.set_command_counter(0);
    m_packet.set_command_timestamp(timer->currentTime() / 1000LL);
    teamInfoSetDefault(m_packet.mutable_blue());
    teamInfoSetDefault(m_packet.mutable_yellow());
}

void InternalGameController::sendUpdate()
{
    // update packet
    m_packet.set_packet_timestamp(m_timer->currentTime() / 1000LL);
    if (m_currentActionStartTime > 0) {
        m_packet.set_current_action_time_remaining(m_currentActionAllowedTime - (m_timer->currentTime() / 1000LL - m_currentActionStartTime));
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
        m_currentActionStartTime = -1;

        auto counterBefore = m_packet.command_counter();
        m_packet.CopyFrom(newState);
        m_packet.set_command_timestamp(m_timer->currentTime() / 1000L);
        m_packet.set_command_counter(counterBefore+1);

        // start timeout for ball placement once the command is issued from the ui
        if (m_packet.command() == SSL_Referee::BALL_PLACEMENT_BLUE || m_packet.command() == SSL_Referee::BALL_PLACEMENT_YELLOW) {
            m_currentActionStartTime = m_timer->currentTime() / 1000L;
            m_currentActionAllowedTime = BALL_PLACEMENT_TIME;
        }
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

static float sign(float x)
{
    return x < 0 ? -1.0f : 1.0f;
}

auto InternalGameController::ballPlacementPosForFoul(Vector foulPosition) -> Vector
{
    Vector result = foulPosition;
    float sideDist = m_geometry.defense_width() + DEFENSE_DISTANCE - std::abs(foulPosition.y);
    float frontDist = std::abs(foulPosition.x) - (m_geometry.defense_height() + DEFENSE_DISTANCE);
    if (std::abs(foulPosition.x) > m_geometry.field_height() / 2.0f - GOAL_LINE_DISTANCE ||
            (sideDist > 0 && frontDist > 0 && sideDist > frontDist)) {
        result.x = sign(foulPosition.x) * (m_geometry.field_height() / 2.0f - GOAL_LINE_DISTANCE);
        result.y = sign(foulPosition.y) * (m_geometry.field_width() / 2.0f - FIELD_LINE_DISTANCE);
        return result;
    }
    if (sideDist > 0 && frontDist > 0) {
        result.x = sign(foulPosition.x) * std::min(m_geometry.field_height() / 2.0f - m_geometry.defense_height() - DEFENSE_DISTANCE, std::abs(foulPosition.x));
        return result;
    }
    result.x = sign(foulPosition.x) * std::min(m_geometry.field_height() / 2.0f - GOAL_LINE_DISTANCE, std::abs(foulPosition.x));
    result.y = sign(foulPosition.y) * std::min(m_geometry.field_width() / 2.0f - FIELD_LINE_DISTANCE, std::abs(foulPosition.y));
    return result;
}

void InternalGameController::issueCommand(SSL_Referee::Command command)
{
    m_packet.set_command(command);
    m_packet.set_command_counter(m_packet.command_counter() + 1);
    m_packet.set_command_timestamp(m_timer->currentTime() / 1000L);
    sendUpdate();
}

void InternalGameController::handleGameEvent(std::shared_ptr<gameController::AutoRefToController> message)
{
    if (!message->has_game_event()) {
        // TODO: emit reply message
        return;
    }
    const gameController::GameEvent &event = message->game_event();

    m_packet.clear_game_events();
    m_packet.add_game_events()->CopyFrom(event);

    // extract location and team name
    std::string byTeamString;
    Vector eventLocation{0, 0};
    Vector eventEnd; // positions used for dribbling are not named location

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
                } else if (fieldName == "location" || fieldName == "start" || fieldName == "end") {
                    const google::protobuf::Message &locationMessage = messageRefl->GetMessage(eventMessage, field);
                    const gameController::Location &location = static_cast<const gameController::Location&>(locationMessage);
                    if (fieldName == "location") {
                        eventLocation.x = location.x();
                        eventLocation.y = location.y();
                    } else if (fieldName == "end") {
                        eventEnd.x = location.x();
                        eventEnd.y = location.y();
                    }

                }
            }
        }
    }

    // TODO: assertions for current state of the game to check the autoref working properly

    if (event.type() != gameController::PREPARED &&
            (m_packet.command() == SSL_Referee::PREPARE_KICKOFF_YELLOW || m_packet.command() == SSL_Referee::PREPARE_KICKOFF_BLUE ||
            m_packet.command() == SSL_Referee::PREPARE_KICKOFF_BLUE || m_packet.command() == SSL_Referee::PREPARE_PENALTY_YELLOW)) {
        return;
    }

    Vector placementPos = m_lastPlacementPos;
    bool placingTeamIsYellow = byTeamString == "BLUE";

    // rule 8.4 simultaneous offenses
    // TODO: only if the event would not result in a penalty kick
    if (m_packet.next_command() && event.type() != gameController::PLACEMENT_SUCCEEDED && event.type() != gameController::PLACEMENT_FAILED &&
            ((!placingTeamIsYellow && m_packet.next_command() == SSL_Referee::DIRECT_FREE_BLUE) ||
             (placingTeamIsYellow && m_packet.next_command() == SSL_Referee::DIRECT_FREE_YELLOW))) {
        return;
    }

    bool shouldPlace = false;
    bool setIsFirstPlacement = true;
    switch (event.type()) {
    case gameController::CHIPPED_GOAL:
    case gameController::INDIRECT_GOAL:
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
        m_packet.set_next_command(placingTeamIsYellow ? SSL_Referee::DIRECT_FREE_YELLOW : SSL_Referee::DIRECT_FREE_BLUE);
        shouldPlace = true;
        break;

    case gameController::PLACEMENT_SUCCEEDED:
    {
        shouldPlace = false;
        if (m_packet.next_command() != SSL_Referee::FORCE_START) {
            m_currentActionStartTime = m_timer->currentTime() / 1000L;
            m_currentActionAllowedTime = 5000000;
        }
        SSL_Referee::Command command = m_packet.next_command();
        m_packet.clear_next_command();
        issueCommand(command);
        break;
    }
    case gameController::PLACEMENT_FAILED:
        setIsFirstPlacement = false;
        shouldPlace = true;
        if (m_isFirstPlacement) {
            m_packet.set_next_command(placingTeamIsYellow ? SSL_Referee::DIRECT_FREE_YELLOW : SSL_Referee::DIRECT_FREE_BLUE);
        } else {
            // both teams failed placing the ball, teleport it instead
            Command ballCommand(new amun::Command);
            ballCommand->mutable_simulator()->mutable_move_ball()->set_teleport_safely(true);
            ballCommand->mutable_simulator()->mutable_move_ball()->set_position(true);
            // use correct coordinates
            ballCommand->mutable_simulator()->mutable_move_ball()->set_p_x(-placementPos.y);
            ballCommand->mutable_simulator()->mutable_move_ball()->set_p_y(placementPos.x);
            emit sendCommand(ballCommand);
        }
        break;
    case gameController::POSSIBLE_GOAL:
    case gameController::GOAL:
        shouldPlace = true;
        placementPos = {0, 0};
        m_packet.set_next_command(placingTeamIsYellow ? SSL_Referee::PREPARE_KICKOFF_YELLOW : SSL_Referee::PREPARE_KICKOFF_BLUE);
        break;
    case gameController::PREPARED:
        shouldPlace = false;
        m_currentActionAllowedTime = 5000000;
        issueCommand(SSL_Referee::NORMAL_START);
        break;
    case gameController::NO_PROGRESS_IN_GAME:
        placingTeamIsYellow = rand() % 2 == 0;
        shouldPlace = true;
        m_packet.set_next_command(SSL_Referee::FORCE_START);
        break;

    // minor offenses
    case gameController::BOT_DRIBBLED_BALL_TOO_FAR:
        shouldPlace = true;
        placementPos = ballPlacementPosForFoul(eventEnd);
        m_packet.set_next_command(placingTeamIsYellow ? SSL_Referee::DIRECT_FREE_YELLOW : SSL_Referee::DIRECT_FREE_BLUE);
        break;
    case gameController::KICK_TIMEOUT:
    case gameController::KEEPER_HELD_BALL:
    case gameController::ATTACKER_DOUBLE_TOUCHED_BALL:
    case gameController::ATTACKER_TOUCHED_OPPONENT_IN_DEFENSE_AREA:
    case gameController::BOT_KICKED_BALL_TOO_FAST:
        shouldPlace = true;
        placementPos = ballPlacementPosForFoul(eventLocation);
        m_packet.set_next_command(placingTeamIsYellow ? SSL_Referee::DIRECT_FREE_YELLOW : SSL_Referee::DIRECT_FREE_BLUE);
        break;

    // major offenses
    case gameController::BOT_INTERFERED_PLACEMENT:
        m_currentActionStartTime = m_timer->currentTime() / 1000L;
        m_currentActionAllowedTime = BALL_PLACEMENT_TIME;
        shouldPlace = false;
        break;
    case gameController::ATTACKER_TOO_CLOSE_TO_DEFENSE_AREA:
    // TODO: advantage rule for pushing and crashing
    case gameController::BOT_CRASH_UNIQUE:
    case gameController::BOT_PUSHED_BOT:
    case gameController::BOT_HELD_BALL_DELIBERATELY:
    case gameController::BOT_TOO_FAST_IN_STOP:
        shouldPlace = true;
        placementPos = ballPlacementPosForFoul(eventLocation);
        m_packet.set_next_command(placingTeamIsYellow ? SSL_Referee::DIRECT_FREE_YELLOW : SSL_Referee::DIRECT_FREE_BLUE);
        break;
    case gameController::DEFENDER_TOO_CLOSE_TO_KICK_POINT:
        shouldPlace = true;
        placementPos = ballPlacementPosForFoul(eventLocation);
        // leave next command the same
        break;
    default:
        // do nothing here, these should not originate from the autoref
        // (or we dont care, i.e. for crash_drawn
        break;
    }
    // TODO: set current action start time to something negative if it is not needed
    // TODO: clear next command when it is not needed
    if (shouldPlace) {
        m_isFirstPlacement = setIsFirstPlacement;
        m_lastPlacementPos = placementPos;
        m_packet.mutable_designated_position()->set_x(placementPos.x * 1000.0f);
        m_packet.mutable_designated_position()->set_y(placementPos.y * 1000.0f);
        m_currentActionStartTime = m_timer->currentTime() / 1000L;
        m_currentActionAllowedTime = BALL_PLACEMENT_TIME;
        issueCommand(placingTeamIsYellow ? SSL_Referee::BALL_PLACEMENT_YELLOW : SSL_Referee::BALL_PLACEMENT_BLUE);
    }
}
