#ifndef COMBINEDLOGWRITER_H
#define COMBINEDLOGWRITER_H

#include "protobuf/robot.pb.h"
#include "protobuf/status.h"

#include <QString>
#include <QObject>
#include <QList>

class LogFileWriter;
class BacklogWriter;
class QThread;
class QDateTime;
class QLabel;
class StatusSource;

class CombinedLogWriter : public QObject
{
    Q_OBJECT
public:
    CombinedLogWriter(bool replay, int backlogLength);
    ~CombinedLogWriter();
    CombinedLogWriter(const CombinedLogWriter&) = delete;
    CombinedLogWriter& operator=(const CombinedLogWriter&) = delete;
    StatusSource * makeStatusSource();
    QList<Status> getBacklogStatus(int lastNPackets);

signals:
    void setRecordButton(bool on);
    void enableRecordButton(bool enable);
    void enableBacklogButton(bool enable);
    void saveBacklogFile(QString filename, const Status &status);
    void gotStatusForRecording(const Status &status);
    void gotStatusForBacklog(const Status &status);
    void changeLogTimeLabel(QString text);
    void showLogTimeLabel(bool show);
    void resetBacklog();
    void disableSkipping(bool disable);

public slots:
    void handleStatus(const Status &status);
    void enableLogging(bool enable); // enables or disables both record and backlog
    void backLogButtonClicked();
    void recordButtonToggled(bool enabled);

private:
    QString createLogFilename() const;
    static QString dateTimeToString(const QDateTime & dt);
    void startLogfile();

private:
    bool m_isReplay;
    BacklogWriter *m_backlogWriter;
    QThread *m_backlogThread;
    LogFileWriter *m_logFile;
    QThread *m_logFileThread;

    robot::Team m_yellowTeam;
    robot::Team m_blueTeam;
    QString m_yellowTeamName;
    QString m_blueTeamName;

    qint64 m_lastTime;
    qint64 m_logStartTime;
    QString m_lastLogTimeLabel;

    bool m_isLoggingEnabled;
    bool m_isRecording;
};

#endif // COMBINEDLOGWRITER_H
