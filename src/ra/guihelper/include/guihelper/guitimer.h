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

#ifndef GUITIMER_H
#define GUITIMER_H

#include <QObject>

class QTimer;
class GuiTimer;

class GuiTimerBase : public QObject
{
    Q_OBJECT
    friend class GuiTimer;
private:
    static GuiTimerBase * instance();

    explicit GuiTimerBase(QObject *parent = 0);
    void requestTriggering();

private slots:
    void handleTimeout();

signals:
    void timeout();

private:
    QTimer *m_timer;
    bool m_isActive;
    const int m_baseInterval;
};

class GuiTimer : public QObject
{
    Q_OBJECT
public:
    explicit GuiTimer(int interval, QObject *parent = 0);
    void requestTriggering();

private slots:
    void handleTimeout();

signals:
    void timeout();

private:
    bool m_isActive;
    const int m_interval;
    qint64 m_nextTriggerTime;
};


#endif // GUITIMER_H
