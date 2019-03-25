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

#include "timingstatistics.h"

#include <QDebug>

void TimingStatistics::handleStatus(const Status &status)
{
    if (status->has_timing()) {
        const amun::Timing &timing = status->timing();
        float time = -1;
        if (m_isBlue && timing.has_blue_total()) {
            time = timing.blue_total();
        } else if (!m_isBlue && timing.has_yellow_total()) {
            time = timing.yellow_total();
        }
        if (time != -1) {
            m_totalTime += time;

            m_counter++;
            int ms = int(time * 1000.0f);
            if (ms >= m_timeHistogram.size()) {
                m_timeHistogram.resize(ms+1);
            }
            m_timeHistogram[ms]++;
            if (m_saveAllData) {
                m_timings.push_back(time);
            }
        }
    }
}

void TimingStatistics::printStatistics(bool showHistogram)
{
    if (m_saveAllData) {
        for (float time : m_timings) {
            qDebug() <<time;
        }
    } else {
        qDebug() <<"Total:"<<m_totalTime<<"s";
        qDebug() <<"Average:"<<1000.0 * m_totalTime / m_counter<<"ms";
        if (showHistogram) {
            qDebug() <<endl<<"Histogram:";
            for (int i = 0;i<m_timeHistogram.size();i++) {
                qDebug() <<i<<"ms:"<<m_timeHistogram[i];
            }
        }
    }
}
