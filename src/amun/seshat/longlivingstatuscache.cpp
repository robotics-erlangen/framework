/***************************************************************************
 *   Copyright 2022 Michael Eischer, Tobias Heineken, Andreas Wendler      *
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

#include "longlivingstatuscache.h"

void LongLivingStatusCache::handleStatus(const Status& status) {
    // keep team configurations for the logfile
    if (status->has_team_yellow()) {
        m_yellowTeam.CopyFrom(status->team_yellow());
    }
    if (status->has_team_blue()) {
        m_blueTeam.CopyFrom(status->team_blue());
    }

    if (status->has_world_state()) {
        for (const auto &vision : status->world_state().vision_frames()) {
            if (vision.has_geometry()) {
                for (const auto &calib : vision.geometry().calib()) {
                    // avoid copying the vision geometry since it is rather large (around 1kb)
                    m_lastVisionGeometryStatus[calib.camera_id()] = status;
                }
            }
        }
    }

    if (status->has_time()) {
        m_lastTime = status->time();
    }
    for(const auto& gitInfo: status->git_info()) {
        m_lastGitInfos[gitInfo.kind()] = status;
    }
}

void LongLivingStatusCache::publish(bool debug) {
    if (m_lastTime == 0) {
        return;
    }
    Status emptyStatus(new amun::Status);
    emptyStatus->set_time(m_lastTime);
    emit sendStatus(emptyStatus);
    emit sendStatus(getTeamStatus());
    emit sendStatus(getVisionGeometryStatus());
    emit sendStatus(getGitStatus());
}

Status LongLivingStatusCache::getTeamStatus()
{
    Status status(new amun::Status);
    status->set_time(m_lastTime);
    status->mutable_team_yellow()->CopyFrom(m_yellowTeam);
    status->mutable_team_blue()->CopyFrom(m_blueTeam);
    return status;
}

Status LongLivingStatusCache::getVisionGeometryStatus()
{
    Status status(new amun::Status);
    status->set_time(m_lastTime);
    if (m_lastVisionGeometryStatus.size() > 0) {
        auto *world = status->mutable_world_state();
        world->set_time(m_lastTime);
        for (int id : m_lastVisionGeometryStatus.keys()) {
            for (const auto &vision : m_lastVisionGeometryStatus[id]->world_state().vision_frames()) {
                if (vision.has_geometry()) {
                    world->add_vision_frames()->mutable_geometry()->CopyFrom(vision.geometry());
                    world->add_vision_frame_times(m_lastTime);
                }
            }
        }
    }
    return status;
}

Status LongLivingStatusCache::getGitStatus()
{
    Status status{new amun::Status};
    status->set_time(m_lastTime);
    for(amun::GitInfo::Kind k : m_lastGitInfos.keys()) {
        for(const auto& info : m_lastGitInfos[k]->git_info()) {
            if (k == info.kind()) {
                status->add_git_info()->CopyFrom(info);
            }
        }
    }
    return status;
}
