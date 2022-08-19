/***************************************************************************
 *   Copyright 2022 Andreas Wendler, Paul Bergmann                         *
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

#ifndef TIMINGSTATISTICS_H
#define TIMINGSTATISTICS_H

#include <QFileInfo>
#include <QObject>
#include <QVector>
#include <fstream>
#include <memory>
#include <optional>
#include <vector>

#include "protobuf/status.h"

struct TimingWriter {
    virtual ~TimingWriter() = default;

    virtual void printRun(int run, double totalTime, double average) = 0;
    virtual void printHistogram(int run, const QVector<int>& timeHistogram) = 0;
    virtual void printCumulativeHistogram(int run, const QVector<double>& perframepercentage) = 0;
};

struct StdoutWriter : public TimingWriter {
    void printRun(int run, double totalTime, double average) override;
    void printHistogram(int run, const QVector<int>& timeHistogram) override;
    void printCumulativeHistogram(int run, const QVector<double>& perFramePercentage) override;
};

class CSVWriter : public TimingWriter {
public:
    CSVWriter(const QFileInfo& baseFile, bool openHistogram, bool openCumulativeHistogram);

    void printRun(int run, double totalTime, double average) override;
    void printHistogram(int run, const QVector<int>& timeHistogram) override;
    void printCumulativeHistogram(int run, const QVector<double>& perFramePercentage) override;
private:
    std::ofstream runFile;
    std::ofstream histFile;
    std::ofstream cumulativeHistFile;
};

class TimingStatistics : public QObject
{
    Q_OBJECT
public:
    TimingStatistics(bool isBlue, TimingWriter* writer, bool saveAllData = false, int frames = 0) :
        m_isBlue(isBlue), m_writer(writer), m_saveAllData(saveAllData) { m_timings.reserve(frames); }
    void printStatistics(int run, bool showHistogram, bool showCumulativeHistogram);

public slots:
    void handleStatus(const Status &status);

private:
    bool m_isBlue;
    TimingWriter* m_writer;
    bool m_saveAllData;
    int m_counter = 0;
    double m_totalTime = 0.0;
    QVector<int> m_timeHistogram;
    QVector<float> m_timings;
};

#endif // TIMINGSTATISTICS_H
