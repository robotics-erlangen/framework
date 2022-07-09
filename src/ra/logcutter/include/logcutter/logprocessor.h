/***************************************************************************
 *   Copyright 2020 Michael Eischer, Tobias Heineken, Andreas Wendler      *
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

#ifndef LOGPROCESSOR_H
#define LOGPROCESSOR_H

#include "protobuf/logfile.pb.h"

#include <QThread>
#include <QList>
#include <QString>
#include <QSemaphore>

class SeqLogFileReader;
class Exchanger;
class LogFileWriter;
class Status;
namespace amun
{
    class GameState;
}

class LogProcessor : public QThread
{
    Q_OBJECT
public:
    enum Option {
        NoOptions = 0x0,
        CutHalt = 0x1,
        CutNonGame = 0x2,
        CutStop = 0x4,
        CutBallplacement = 0x8,
        CutSimulated = 0x10,
        CutDebugTree = 0x20,
        CutLogOutput = 0x40,
        CutVisualizations = 0x80,
        CutPlot = 0x100,
        CutGit = 0x200
    };
    Q_DECLARE_FLAGS(Options, Option)

    explicit LogProcessor(const QList<QString>& inputFiles, const QString& outputFile,
                          Options options, QObject *parent = 0, bool ignoreHashing = false);
    ~LogProcessor() override;
    LogProcessor(const LogProcessor&) = delete;
    LogProcessor& operator=(const LogProcessor&) = delete;

    void run() override;

signals:
    void progressUpdate(const QString& progress);
    void finishedProcessing();
    void error(const QString &message);
    void outputSelected(LogFileWriter* writer);

private:
    qint64 filterLog(SeqLogFileReader &reader, Exchanger *writer, Exchanger *dump, qint64 lastTime, logfile::Uid& uid);
    void signalFrames(QString prefix, int currentFrame, double percent) { emit progressUpdate((prefix+" %1 frames (%2%) in logfile %3 of %4").arg(currentFrame).arg(((int)(percent*100)), 2).arg(m_currentLog).arg(m_inputFiles.size())); }
    bool skipStatus(const amun::GameState& lastGameState, bool isSimulated) const;
    void removeDebugOutput(Status& status);
    void changeTimestamps(Status& status, qint64 timeRemoved, bool& isSimulated) const;
    void collectHashes(QList<SeqLogFileReader*> reader, Exchanger* writer);
    void reencode(SeqLogFileReader* reader, Exchanger* writer);
    void sendOutputSelected(LogFileWriter* writer);
    logfile::Uid calculateUid() const;

    QList<QString> m_inputFiles;
    QList<logfile::Uid> m_hashes;
    QString m_outputFile;
    Options m_options;
    QSemaphore m_semaphore;

    int m_currentLog;
    bool m_ignoreHashing;
};

Q_DECLARE_OPERATORS_FOR_FLAGS(LogProcessor::Options)

#endif // LOGPROCESSOR_H
