/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef FILTER_H
#define FILTER_H

#include <QtGlobal>

class Filter
{
public:
    explicit Filter(qint64 last_time);
    virtual ~Filter();

public:
    qint64 lastUpdate() const { return m_lastTime; }
    qint64 lastPrimaryTime() const { return m_lastPrimaryTime; }
    quint32 primaryCamera() const { return m_primaryCamera; }
    int frameCounter() const { return m_frameCounter; }

protected:
    qint64 m_lastTime;
    qint64 m_lastPrimaryTime;
    qint32 m_primaryCamera;
    int m_frameCounter;
};

#endif // FILTER_H
