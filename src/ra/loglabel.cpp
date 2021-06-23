/***************************************************************************
 *   Copyright 2020 Tobias Heineken, Andreas Wendler                       *
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
#include "loglabel.h"
#include "protobuf/status.h"

void LogLabel::handleStatus(const Status& s) {
    if (s->has_pure_ui_response()) {
        const amun::UiResponse& response = s->pure_ui_response();
        if (response.has_logging_info()) {
            if (response.logging_info().is_logging()) {
                m_logStartTime = s->time(); // FIXME: Having one state for Ra & Horus is doomed.
                setVisible(true);
            } else {
                m_logStartTime = 0;
                setVisible(false);
            }
        }
    }
    if (m_logStartTime != 0) {
        qint64 timeDelta = s->time() - m_logStartTime;
        const double dtime = timeDelta * 1E-9;
        QString logLabel = "Log time: " + QString("%1:%2").arg((int) dtime / 60)
                .arg((int) dtime % 60, 2, 10, QChar('0'));
        if (m_lastLogTimeLabel != logLabel) {
            m_lastLogTimeLabel = logLabel;
            setText(logLabel);
        }
    }
}
