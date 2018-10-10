#include "logprocessor.h"
#include "logfile/seqlogfilereader.h"
#include "logfile/logfilewriter.h"
#include "logfile/logfilehasher.h"
#include "protobuf/gamestate.pb.h"
#include "protobuf/status.pb.h"
#include <QSemaphore>
#include <QMutex>
#include <QLinkedList>
#include <QTemporaryFile>
#include <QFlags>

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

class LogWriter : public QObject {
    Q_OBJECT
public:
    LogWriter(Exchanger *inExchanger, Exchanger *dumpExchanger, QSemaphore& sem):
       m_inExchanger(inExchanger), m_dumpExchanger(dumpExchanger), m_sem(sem){}
public slots:
    void write(LogFileWriter *writer){
        while (true) {
            // write status and forward to call destructor in seperate thread
            // destruction takes a significant amount of time (20% of total!)
            Status status = m_inExchanger->take();
            if (status.isNull()) {
                writer->close();
                m_sem.release();
                break;
            }
            writer->writeStatus(status);
            m_dumpExchanger->transfer(status);
        }
    }
    void shutdown(){
        Status emptyStatus;
        m_dumpExchanger->transfer(emptyStatus);
        deleteLater();
    }

private:
    Exchanger *m_inExchanger;
    Exchanger *m_dumpExchanger;
    QSemaphore& m_sem;
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
{
    m_semaphore.release(1);
}

LogProcessor::~LogProcessor()
{ }

void LogProcessor::run()
{
    m_currentLog = 1;

    QList<SeqLogFileReader *> logreaders;
    for (int i = 0; i < m_inputFiles.size(); ++i) {
        const QString& logfile = m_inputFiles[i];
        SeqLogFileReader *reader = new SeqLogFileReader;
        logreaders.append(reader);
        if (!reader->open(logfile)) {
            emit error("Failed to open logfile: " + logfile);
            qDeleteAll(logreaders);
            return;
        }
        emit progressUpdate(QString("Opened Logfile %1 of %2").arg(i).arg(m_inputFiles.size()));
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
    LogWriter* writerObject = new LogWriter(&writerExchanger, &dumpExchanger, m_semaphore);
    QThread *writerThread = new QThread();
    writerObject->moveToThread(writerThread);
    connect(this, &LogProcessor::outputSelected, writerObject, &LogWriter::write);
    connect(writerThread, SIGNAL(finished()), writerObject, SLOT(shutdown()));

    QThread *dumpThread = new LogDump(&dumpExchanger);
    writerThread->start();
    dumpThread->start();

    //handle hashing
    collectHashes(logreaders, &writerExchanger);
    logfile::Uid resultingUid = calculateUid();

    // stream data
    emit outputSelected(&writer);
    qint64 lastTime = 0;
    m_currentLog = 1;
    for (SeqLogFileReader *reader: logreaders) {
        lastTime = filterLog(*reader, &writerExchanger, &dumpExchanger, lastTime, resultingUid);
        m_currentLog++;
    }

    // kill pipeline
    Status emptyStatus;
    writerExchanger.transfer(emptyStatus);
    //only the writerThread uses the event queue, and it's shutdown stops dumpThread
    writerThread->quit();
    writerThread->wait();
    dumpThread->wait();

    delete writerThread;
    delete dumpThread;

    // cleanup
    qDeleteAll(logreaders);

    emit finished();
}

// skip uninteresting states
bool LogProcessor::skipStatus(const amun::GameState& lastGameState, bool isSimulated) const
{
    if (m_options & CutHalt) {
        if (lastGameState.IsInitialized()
                && (lastGameState.state() == amun::GameState::Halt
                    || lastGameState.state() == amun::GameState::TimeoutBlue
                    || lastGameState.state() == amun::GameState::TimeoutYellow)) {
            return true;
        }
    }
    if (m_options & CutNonGame) {
        if (!lastGameState.IsInitialized()
                || (lastGameState.stage() != SSL_Referee::NORMAL_FIRST_HALF
                    && lastGameState.stage() != SSL_Referee::NORMAL_SECOND_HALF
                    && lastGameState.stage() != SSL_Referee::EXTRA_FIRST_HALF
                    && lastGameState.stage() != SSL_Referee::EXTRA_SECOND_HALF
                    && lastGameState.stage() != SSL_Referee::PENALTY_SHOOTOUT)) {
            return true;
        }
    }
    if (m_options & CutStop) {
        if (lastGameState.IsInitialized()
                && lastGameState.state() == amun::GameState::Stop) {
            return true;
        }
    }
    if (m_options & CutBallplacement) {
        if (lastGameState.IsInitialized()
                && (lastGameState.state() == amun::GameState::BallPlacementBlue
                    || lastGameState.state() == amun::GameState::BallPlacementYellow)) {
                return true;
        }
    }
    if (m_options & CutSimulated && isSimulated) {
        return true;
    }
    return false;
}

void LogProcessor::changeTimestamps(Status& status, qint64 timeRemoved, bool& isSimulated) const
{
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
}

qint64 LogProcessor::filterLog(SeqLogFileReader &reader, Exchanger *writer, Exchanger *dump, qint64 lastTime, logfile::Uid& loguid)
{
    qint64 timeRemoved = 0;
    qint64 lastWrittenTime = 0;

    amun::GameState lastGameState;

    Status modStatus;
    bool isSimulated = false;
    int currentFrame = 0;
    while(!reader.atEnd()){
        if ((currentFrame % 1000) == 0) {
            signalFrames("Processed", currentFrame, reader.percent());
        }
        currentFrame++;

        Status status = reader.readStatus();
        // skip invalid packets
        if (status.isNull()) {
            continue;
        }

        if (status->has_log_id()) {
            status->clear_log_id();
        }


        // removed deleted time
        qint64 timeDelta = (lastTime != 0) ? status->time() - lastTime : 0;
        // remove time between log files
        if (currentFrame == 1 && lastTime != 0) {
            timeRemoved = timeDelta;
            timeDelta = 0;
        }
        lastTime = status->time();
        changeTimestamps(status, timeRemoved, isSimulated);

        // keep game status to find relevant frames
        if (status->has_game_state()) {
            lastGameState = status->game_state();
        }

        if (skipStatus(lastGameState, isSimulated)) {
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

            timeRemoved += timeDelta;
            dump->transfer(status);
            continue;
        }
        if (loguid.IsInitialized()) {
            status->mutable_log_id()->CopyFrom(loguid);
            loguid.Clear();
        }
        status->set_original_frame_number(currentFrame - 1);

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

void LogProcessor::sendOutputSelected(LogFileWriter* writer)
{
    m_semaphore.acquire();
    emit outputSelected(writer);
}

void LogProcessor::collectHashes(QList<SeqLogFileReader*> readers, Exchanger* writer)
{
    if (!m_hashes.empty()) qFatal("LogProcessor: collect Hashes called twice");

    for (int i = 0; i < readers.size(); ++i) {
        emit progressUpdate(QString("Hashing logfile %1 of %2").arg(i).arg(readers.size()));
        SeqLogFileReader* reader = readers[i];
        SeqLogFileReader::Memento mem = reader->createMemento();
        Status s = reader->readStatus();
        reader->applyMemento(mem);
        logfile::Uid hash;
        if (s->has_log_id()) {
            hash = s->log_id();
        }
        else {
            //QTemporaryFile will be delete when out of scope
            QTemporaryFile tmpFile(reader->fileName()+".tmp");
            tmpFile.open();
            LogFileWriter hashWriter;
            hashWriter.open(tmpFile.fileName());
            sendOutputSelected(&hashWriter);
            hash.add_parts()->mutable_hash()->assign(LogFileHasher::hash(*reader));
            reencode(reader, hash, writer);
            //Wait for LogWriter to finish writing
            m_semaphore.acquire();
            m_semaphore.release();
            LogFileHasher::replace(tmpFile.fileName(), reader->fileName());
            //TODO: check how overriding logfiles behaves on different OS
            //Assumption: UNIX keeps old fp, and therefore rehashes the same logfile twice, while Windows don't know.
        }
        m_hashes.append(hash);
        m_currentLog++;
    }
    emit progressUpdate("Hashing completed");
}

void LogProcessor::reencode(SeqLogFileReader* reader, const logfile::Uid& hash, Exchanger* writer)
{
    SeqLogFileReader::Memento mem = reader->createMemento();
    Status current = reader->readStatus();
    if (current->has_log_id()) qFatal("Reencode a logfile that already contains a logfile:uid");
    *(current->mutable_log_id()) = hash;
    writer->transfer(current);
    for (int i = 1; !reader->atEnd(); ++i) {
        current = reader->readStatus();
        writer->transfer(current);
        if (i % 1000 == 0) signalFrames("Rehash", i, reader->percent());
    }
    //kill pipeline
    Status empty;
    writer->transfer(empty);
    reader->applyMemento(mem);
}

logfile::Uid LogProcessor::calculateUid() const
{
    logfile::Uid res;

    for (const auto& entry: m_hashes) {
        for(const auto& part : entry.parts()) {
            auto* resPart = res.add_parts();
            resPart->set_hash(part.hash());
            Options partOption((part.flags()));
            resPart->set_flags(partOption | m_options);
        }
    }
    return res;
}
#include "logprocessor.moc"
