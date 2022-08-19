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

#include <QDir>
#include <QString>
#include <QtGlobal>
#include <iomanip>
#include <iostream>

void StdoutWriter::printRun(int run, double totalTime, double average)
{
    std::cout << "Total: "<< totalTime << " s"<<std::endl;
    std::cout << "Average: " << average << " ms" << std::endl;
}

void StdoutWriter::printHistogram(int run, const QVector<int>& timeHistogram)
{
    (void) run;

    std::cout << std::endl<< "Histogram:" << std::endl;
    for (int i = 0; i < timeHistogram.size(); ++i) {
        std::cout << i << " ms: " << timeHistogram[i] << std::endl;
    }
}

void StdoutWriter::printCumulativeHistogram(int run, const QVector<double>& perFramePercentage)
{
    (void) run;

    std::cout << std::endl << "Histogram (cumulative):" << std::endl;
    for (int i = 0; i < perFramePercentage.size(); ++i) {
        std::cout << std::setprecision(4) << i << " ms: " << perFramePercentage[i] << std::endl;
    }
}

CSVWriter::CSVWriter(const QFileInfo& baseFile, bool openHistogram, bool openCumulativeHistogram)
{
    Q_ASSERT(!baseFile.isDir());
    const QDir baseDir = baseFile.dir();
    const QString baseFileName = baseFile.fileName();

    const QString runFileName = baseDir.filePath(baseFileName + ".runs.csv");
    runFile.open(runFileName.toStdString().c_str());
    Q_ASSERT(runFile.is_open());
    runFile << "\"run\",\"total_s\",\"average_ms\"" << std::endl;

    if (openHistogram) {
        const QString fileName = baseDir.filePath(baseFileName + ".histogram.csv");
        histFile.open(fileName.toStdString().c_str());
        Q_ASSERT(histFile.is_open());
        histFile << "\"run\",\"frametime\",\"count\"" << std::endl;
    }

    if (openCumulativeHistogram) {
        const QString fileName = baseDir.filePath(baseFileName + ".cumulative.csv");
        cumulativeHistFile.open(fileName.toStdString().c_str());
        Q_ASSERT(cumulativeHistFile.is_open());
        cumulativeHistFile << "\"run\",\"frametime\",\"percentage\"" << std::endl;
    }
}

void CSVWriter::printRun(int run, double totalTime, double average) {
    Q_ASSERT(runFile.is_open());
    runFile << run << "," << totalTime << "," << average << std::endl;
}

void CSVWriter::printHistogram(int run, const QVector<int>& timeHistogram) {
    Q_ASSERT(histFile.is_open());
    for (int i = 0; i < timeHistogram.size(); ++i) {
        histFile << run << "," << i << "," << timeHistogram[i] << std::endl;
    }
}

void CSVWriter::printCumulativeHistogram(int run, const QVector<double>& perFramePercentages) {
    Q_ASSERT(cumulativeHistFile.is_open());
    for (int i = 0; i < perFramePercentages.size(); ++i) {
        cumulativeHistFile << run << "," << std::setprecision(4) << i << "," << perFramePercentages[i] << std::endl;
    }
}

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

void TimingStatistics::printStatistics(int run, bool showHistogram, bool showCumulativeHistogram)
{
    if (m_saveAllData) {
        for (float time : m_timings) {
            std::cout <<time<<std::endl;
        }
    } else {
        m_writer->printRun(run, m_totalTime, 1000.0 * m_totalTime / m_counter);

        if (showHistogram) {
            m_writer->printHistogram(run, m_timeHistogram);
        }

        if (showCumulativeHistogram) {
            QVector<double> perFramePercentages;
            perFramePercentages.reserve(m_timeHistogram.size());

            int total = 0;
            int totalFrames = std::accumulate(m_timeHistogram.begin(), m_timeHistogram.end(), 0);
            for (int i = 0; i < m_timeHistogram.size(); ++i) {
                total += m_timeHistogram[i];
                perFramePercentages.push_back(100.0 * double(total) / double(totalFrames));
            }

            m_writer->printCumulativeHistogram(run, perFramePercentages);
        }
    }
}
