#include "logprocessor.h"
#include "logfile/logfilereader.h"
#include "logfile/logfilewriter.h"
#include "protobuf/gamestate.pb.h"
#include "protobuf/status.pb.h"
#include <QSemaphore>
#include <QMutex>
#include <QLinkedList>

class Exchanger {
public:
    Exchanger() {
        m_inSemaphore.release(200);
    }

    void transfer(Status &status) {
        m_inSemaphore.acquire();
        m_mutex.lock();
        m_status.prepend(status);
        m_mutex.unlock();
        status.clear(); // drop own reference to ensure gc in the receiver thread
        m_outSemaphore.release();
    }

    Status take() {
        m_outSemaphore.acquire();
        m_mutex.lock();
        Status status = m_status.takeLast();
        m_mutex.unlock();
        m_inSemaphore.release();
        return status;
    }

private:
    QLinkedList<Status> m_status;
    QSemaphore m_inSemaphore;
    QSemaphore m_outSemaphore;
    QMutex m_mutex;
};

class LogWriter : public QThread {
public:
    LogWriter(LogFileWriter *writer, Exchanger *inExchanger, Exchanger *dumpExchanger) {
        m_writer = writer;
        m_inExchanger = inExchanger;
        m_dumpExchanger = dumpExchanger;
    }

protected:
   void run() override {
        while (true) {
            // write status and forward to call destructor in seperate thread
            // destruction takes a significant amount of time (20% of total!)
            Status status = m_inExchanger->take();
            if (status.isNull()) {
                m_dumpExchanger->transfer(status);
                break;
            }
            m_writer->writeStatus(status);
            m_dumpExchanger->transfer(status);
        }
    }

private:
    LogFileWriter *m_writer;
    Exchanger *m_inExchanger;
    Exchanger *m_dumpExchanger;
};

class LogDump : public QThread {
public:
    explicit LogDump(Exchanger *dumpExchanger) {
        m_dumpExchanger = dumpExchanger;
    }

protected:
    void run() override {
        while (true) {
            // just destruct the status
            Status status = m_dumpExchanger->take();
            if (status.isNull()) {
                break;
            }
        }
    }

private:
    Exchanger *m_dumpExchanger;
};

LogProcessor::LogProcessor(const QList<QString> &inputFiles, const QString &outputFile,
                           Options options, QObject *parent)
    : QThread(parent), m_inputFiles(inputFiles), m_outputFile(outputFile),
      m_options(options)
{ }

LogProcessor::~LogProcessor()
{ }

void LogProcessor::run()
{
    m_currentFrame = 0;
    m_totalFrames = 0;

    QList<LogFileReader *> logreaders;
    for (QString logfile: m_inputFiles) {
        LogFileReader *reader = new LogFileReader;
        logreaders.append(reader);
        if (!reader->open(logfile)) {
            emit error("Failed to open logfile: " + logfile);
            qDeleteAll(logreaders);
            return;
        }
        m_totalFrames += reader->packetCount();
        emit progressUpdate(m_currentFrame, m_totalFrames);
    }

    LogFileWriter writer;
    if (!writer.open(m_outputFile)) {
        emit error("Failed to output logfile: " + m_outputFile);
        qDeleteAll(logreaders);
        return;
    }

    // setup pipeline
    Exchanger writerExchanger;
    Exchanger dumpExchanger;
    QThread *writerThread = new LogWriter(&writer, &writerExchanger, &dumpExchanger);
    QThread *dumpThread = new LogDump(&dumpExchanger);
    writerThread->start();
    dumpThread->start();

    // stream data
    qint64 lastTime = 0;
    for (LogFileReader *reader: logreaders) {
        lastTime = filterLog(*reader, &writerExchanger, &dumpExchanger, lastTime);
    }

    // kill pipeline
    Status emptyStatus;
    writerExchanger.transfer(emptyStatus);
    writerThread->wait();
    dumpThread->wait();

    delete writerThread;
    delete dumpThread;

    // cleanup
    qDeleteAll(logreaders);
    writer.close();

    emit finished();
}

qint64 LogProcessor::filterLog(LogFileReader &reader, Exchanger *writer, Exchanger *dump, qint64 lastTime)
{
    qint64 timeRemoved = 0;
    qint64 lastWrittenTime = 0;

    amun::GameState lastGameState;

    Status modStatus;
    bool isSimulated = false;
    for (int i = 0; i < reader.packetCount(); ++i) {
        if ((m_currentFrame % 1000) == 0) {
            emit progressUpdate(m_currentFrame, m_totalFrames);
        }
        m_currentFrame++;

        Status status = reader.readStatus(i);
        // skip invalid packets
        if (status.isNull()) {
            continue;
        }

        // removed deleted time
        qint64 timeDelta = (lastTime != 0) ? status->time() - lastTime : 0;
        // remove time between log files
        if (i == 0 && lastTime != 0) {
            timeRemoved = timeDelta;
            timeDelta = 0;
        }
        lastTime = status->time();
        status->set_time(status->time() - timeRemoved);
        if (status->has_world_state()) {
            world::State *state = status->mutable_world_state();
            state->set_time(state->time() - timeRemoved);

            if (state->has_ball()) {
                world::Ball *ball = state->mutable_ball();
                for (auto it = ball->mutable_raw()->begin(); it != ball->mutable_raw()->end(); ++it) {
                    it->set_time(it->time() - timeRemoved);
                }
            }

            for (auto it = state->mutable_blue()->begin(); it != state->mutable_blue()->end(); ++it) {
                for (auto it2 = it->mutable_raw()->begin(); it2 != it->mutable_raw()->end(); ++it2) {
                    it2->set_time(it2->time() - timeRemoved);
                }
            }

            for (auto it = state->mutable_yellow()->begin(); it != state->mutable_yellow()->end(); ++it) {
                for (auto it2 = it->mutable_raw()->begin(); it2 != it->mutable_raw()->end(); ++it2) {
                    it2->set_time(it2->time() - timeRemoved);
                }
            }

            for (auto it = state->mutable_radio_response()->begin(); it != state->mutable_radio_response()->end(); ++it) {
                it->set_time(it->time() - timeRemoved);
            }

            if (state->has_is_simulated()) {
                isSimulated = state->is_simulated();
            }
        }
        for (amun::DebugValues debug : *status->mutable_debug()) {
            if (debug.has_time()) {
                 debug.set_time(debug.time() - timeRemoved);
            }
        }

        // keep game status to find relevant frames
        if (status->has_game_state()) {
            lastGameState = status->game_state();
        }

        bool skipStatus = false;

        // skip uninteresting states
        if (m_options & CutHalt) {
            if (lastGameState.IsInitialized()
                    && (lastGameState.state() == amun::GameState::Halt
                        || lastGameState.state() == amun::GameState::TimeoutBlue
                        || lastGameState.state() == amun::GameState::TimeoutYellow)) {
                skipStatus = true;
            }
        }
        if (m_options & CutNonGame) {
            if (!lastGameState.IsInitialized()
                    || (lastGameState.stage() != SSL_Referee::NORMAL_FIRST_HALF
                        && lastGameState.stage() != SSL_Referee::NORMAL_SECOND_HALF
                        && lastGameState.stage() != SSL_Referee::EXTRA_FIRST_HALF
                        && lastGameState.stage() != SSL_Referee::EXTRA_SECOND_HALF
                        && lastGameState.stage() != SSL_Referee::PENALTY_SHOOTOUT)) {
                skipStatus = true;
            }
        }
        if (m_options & CutStop) {
            if (lastGameState.IsInitialized()
                    && lastGameState.state() == amun::GameState::Stop) {
                skipStatus = true;
            }
        }
        if (m_options & CutBallplacement) {
            if (lastGameState.IsInitialized()
                    && (lastGameState.state() == amun::GameState::BallPlacementBlue
                        || lastGameState.state() == amun::GameState::BallPlacementYellow)) {
                    skipStatus = true;
            }
        }
        if (m_options & CutSimulated && isSimulated) {
            skipStatus = true;
        }

        if (skipStatus) {
            // the frame contains team settings, these MUST be retained
            if (status->has_team_yellow() || status->has_team_blue()) {
                modStatus = Status(new amun::Status);
                if (status->has_team_yellow()) {
                    modStatus->mutable_team_yellow()->CopyFrom(status->team_yellow());
                }
                if (status->has_team_blue()) {
                    modStatus->mutable_team_blue()->CopyFrom(status->team_blue());
                }
            }

            lastWrittenTime = status->time();
            timeRemoved += timeDelta;
            dump->transfer(status);
            continue;
        }

        if (!modStatus.isNull()) {
            modStatus->set_time(status->time());
            writer->transfer(modStatus);
            modStatus.clear();
        }

        lastWrittenTime = status->time();
        writer->transfer(status);
    }

    return lastWrittenTime;
}
