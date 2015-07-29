#ifndef LOGPROCESSOR_H
#define LOGPROCESSOR_H

#include <QThread>
#include <QList>
#include <QString>

class LogFileReader;
class Exchanger;

class LogProcessor : public QThread
{
    Q_OBJECT
public:
    enum Option {
        NoOptions = 0x0,
        CutHalt = 0x1,
        CutNonGame = 0x2
    };
    Q_DECLARE_FLAGS(Options, Option)

    explicit LogProcessor(const QList<QString>& inputFiles, const QString& outputFile,
                          Options options, QObject *parent = 0);
    ~LogProcessor();

    void run();

signals:
    void progressUpdate(int currentFrame, int totalFrames);
    void finished();
    void error(const QString &message);

private:
    qint64 filterLog(LogFileReader &reader, Exchanger *writer, Exchanger *dump, qint64 lastTime);

    QList<QString> m_inputFiles;
    QString m_outputFile;
    Options m_options;

    int m_currentFrame;
    int m_totalFrames;
};

Q_DECLARE_OPERATORS_FOR_FLAGS(LogProcessor::Options)

#endif // LOGPROCESSOR_H
