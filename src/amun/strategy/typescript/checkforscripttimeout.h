/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#ifndef CHECKFORSCRIPTTIMEOUT_H
#define CHECKFORSCRIPTTIMEOUT_H

#include <QTimer>
#include <v8.h>

class CheckForScriptTimeout: public QTimer {
    Q_OBJECT
public:
    CheckForScriptTimeout(v8::Isolate *isolate, QAtomicInt &counter) :
        m_isolate(isolate),
        m_executionCounter(counter),
        m_lastCounter(-1)
    {
        start(500);
        connect(this, SIGNAL(timeout()), SLOT(timeoutCallback()));
    }

    void setTimeoutCallback(v8::InterruptCallback holder, void *extraData) {
        m_timeoutCallback = holder;
        m_timeoutCallbackData = extraData;
    }

public slots:
    void timeoutCallback() {
        int counter = m_executionCounter.load();
        if (counter == m_lastCounter && counter != 0) {
            if (m_timeoutCallback != nullptr) {
                m_isolate->RequestInterrupt(m_timeoutCallback, m_timeoutCallbackData);
            } else {
                m_isolate->TerminateExecution();
            }
        }
        m_lastCounter = counter;
    }

private:
    v8::Isolate *m_isolate;
    QAtomicInt &m_executionCounter;
    int m_lastCounter;
    v8::InterruptCallback m_timeoutCallback = nullptr;
    void *m_timeoutCallbackData;
};

#endif // CHECKFORSCRIPTTIMEOUT_H
