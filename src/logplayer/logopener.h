#ifndef LOGOPENER_H
#define LOGOPENER_H

#include <QObject>
#include <QList>
#include <QMap>

#include "protobuf/status.h"

class QMenu;
class QAction;
class LogFileReader;
namespace Ui {
    class MainWindow;
}

// see this class as more of a mixin for mainwindow for opening logfiles
// the MainWindow class has to provide a logmanager, an open file menu (with a actionLogCutter action)
// and an open file button btnOpen
class LogOpener : public QObject
{
    Q_OBJECT
public:
    explicit LogOpener(Ui::MainWindow *ui, QObject *parent = nullptr);
    void close();

signals:
    void logOpened();

public slots:
    void handleStatus(const Status &status);
    void openFile(const QString &filename);
    void openFile();
    void goToLastFilePosition();

private:
    void makeRecentFileMenu();

private:
    Ui::MainWindow *ui;

    LogFileReader * m_logfile;

    QList<QString> m_recentFiles;
    QMap<QString, uint> m_lastFilePositions;
    uint m_packetsSinceOpened;
    QMenu *m_recentFilesMenu;
    QAction *m_recentFilesMenuAction;

    const int MAX_RECENT_FILE_COUNT = 10;
};

#endif // LOGOPENER_H
