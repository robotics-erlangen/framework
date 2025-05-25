/***************************************************************************
 *   Copyright 2025 Andreas Wendler, Paul Bergmann                         *
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

#pragma once

#include "protobuf/command.h"
#include "protobuf/world.pb.h"
#include <QObject>
#include <QVector>

class SSL_Referee;
class Status;
class Timer;
class Vector;

/*! \brief Simulates field interactions that would normally be done by a human.
 *
 * This includes e.g. placing the ball after a goal or after both teams failed
 * placement (normally done by the referee), and robot exchanges (normally done
 * by the robot handler)
 */
class HumanInterventionSimulator : public QObject
{
    Q_OBJECT
public:
    explicit HumanInterventionSimulator(const Timer *timer, QObject *parent = nullptr);

    /*! \brief Checks if the ball should be teleported, and if so, teleports
     * it.
     *
     * \return true if an command teleporting the ball was sent, false
     * otherwise.
     */
    bool handleBallTeleportation(const SSL_Referee &referee);

    /*! \brief Removes or adds robots from and to the field if the number of
     * robots exceeds or subceeds the allowed number of robots.
     */
    void handleNumberOfRobots(const world::State &worldState);

    void handleStatus(const Status &status);

signals:
    void sendCommand(const Command &command);
    void sendStatus(const Status &status);
    void sendRefereeCommand(SSL_Referee::Command command);

private:
    bool isPositionFreeToEnterRobot(Vector pos, const world::State &worldState);
    void teleportBallTo(float x, float y);

private:
    const Timer *m_timer;

    bool m_ballIsTeleported = false;
    qint64 m_lastExchangeTime = 0;
    float m_fieldWidth = 1; // short side of the field
    QVector<uint32_t> m_blueTeamIds, m_yellowTeamIds;
    int m_allowedRobotsBlue = 11;
    int m_allowedRobotsYellow = 11;
};
