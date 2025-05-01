/***************************************************************************
 *   Copyright 2025 Andreas Wendler                                        *
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

 #include "gameeventcollector.h"
 #include "statussource.h"

 GameEventCollector::GameEventCollector(const std::shared_ptr<StatusSource>& source, QObject* parent) :
    QObject(parent),
    m_statusSource(source)
{}

void GameEventCollector::process()
{
    const auto REPORT_EVERY_N_FRAMES = 1000;
    const auto numPackets = m_statusSource->packetCount();

    GameEventList events;

    std::unordered_set<std::string> eventIds;
    for (int i = 0; i < numPackets; i++) {
        const auto status = m_statusSource->readStatus(i);
        if (!status->has_game_state()) {
            continue;
        }
        const amun::GameState &game_state = status->game_state();
        for (const auto &event : game_state.game_event_2019()) {
            const auto& id = event.id();
            if (!eventIds.contains(id)) {
                eventIds.insert(id);
                events.emplace_back(i, event);
            }
        }
        if (i % REPORT_EVERY_N_FRAMES == 0) {
            sendProgress(i, events);
            events.clear();
        }
    }

    sendProgress(numPackets, events);
}

void GameEventCollector::sendProgress(int currentPacket, const GameEventList& events)
{
    const auto numPackets = m_statusSource->packetCount();

    auto s = Status::createArena();
    auto* response = s->mutable_pure_ui_response();
    auto* progressReport = response->mutable_game_events_progress();
    progressReport->set_current_packet(currentPacket);
    progressReport->set_total_packets(numPackets);
    progressReport->mutable_game_events()->Reserve(events.size());
    for (const auto& [packet, event] : events) {
        auto* logEvent = progressReport->add_game_events();
        logEvent->set_packet(packet);
        *logEvent->mutable_game_event() = event;
    }
    emit sendUi(s);
}