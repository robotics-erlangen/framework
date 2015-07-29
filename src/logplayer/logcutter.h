#ifndef LOGCUTTER_H
#define LOGCUTTER_H

#include <QWidget>

namespace Ui {
class LogCutter;
}

class LogProcessor;

class LogCutter : public QWidget
{
    Q_OBJECT

public:
    explicit LogCutter(QWidget *parent = 0);
    ~LogCutter();

private slots:
    void selectOutputFile();
    void startProcess();

    void updateProgress(int currentFrame, int totalFrames);
    void updateError(const QString &error);
    void updateFinished();

    void addSourceFile();
    void removeSourceFile();
    void clearSourceFiles();
private:
    void lockUI(bool lock);

    Ui::LogCutter *ui;
    LogProcessor *m_processor;
};

#endif // LOGCUTTER_H
