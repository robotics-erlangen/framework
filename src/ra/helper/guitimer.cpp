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

#include "guitimer.h"
#include "core/timer.h"
#include <QTimer>

GuiTimerBase::GuiTimerBase(QObject *parent) : QObject(parent), m_isActive(false), m_baseInterval(30)
{
    m_timer = new QTimer(parent);
    m_timer->setInterval(m_baseInterval);
    m_timer->setSingleShot(false);
    connect(m_timer, &QTimer::timeout, this, &GuiTimerBase::handleTimeout);
}

GuiTimerBase * GuiTimerBase::instance()
{
    static GuiTimerBase gt;
    return &gt;
}

void GuiTimerBase::requestTriggering()
{
    if (!m_timer->isActive()) {
        m_timer->start();
    }
    m_isActive = true;
}

void GuiTimerBase::handleTimeout()
{
    if (!m_isActive) {
        // stop timer if it wasn't retriggered since the last timeout
        m_timer->stop();
    }
    m_isActive = false;
    emit timeout();
}


GuiTimer::GuiTimer(int interval, QObject *parent) : QObject(parent), m_isActive(false),
         m_interval(interval), m_nextTriggerTime(0)
{
    connect(GuiTimerBase::instance(), &GuiTimerBase::timeout, this, &GuiTimer::handleTimeout);
}

void GuiTimer::requestTriggering()
{
    if (!m_isActive) {
        qint64 curTime = Timer::systemTime() / (1000*1000);
        // only update trigger time if the timer was inactive for more than one interval
        if (m_nextTriggerTime <= curTime) {
            m_nextTriggerTime = Timer::systemTime() / (1000*1000) + m_interval;
        }
    }
    m_isActive = true;
    GuiTimerBase::instance()->requestTriggering();
}

void GuiTimer::handleTimeout()
{
    if (!m_isActive) {
        return;
    }
    // allow a small timeout error
    if (Timer::systemTime() / (1000*1000) >= m_nextTriggerTime - 1) {
        // preset trigger time to keep interval constant
        m_nextTriggerTime += m_interval;
        m_isActive = false;
        emit timeout();
    } else {
        // keep timer active
        GuiTimerBase::instance()->requestTriggering();
    }
}
