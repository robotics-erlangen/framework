#ifndef REPLAYTEAMWIDGET_H
#define REPLAYTEAMWIDGET_H

#include <QWidget>
#include <QStringList>
#include "protobuf/status.h"
#include "protobuf/command.h"

namespace Ui {
class ReplayTeamWidget;
}

class ReplayTeamWidget : public QWidget
{
    Q_OBJECT

public:
    explicit ReplayTeamWidget(QWidget *parent = 0);
    ~ReplayTeamWidget();
    ReplayTeamWidget(const ReplayTeamWidget&) = delete;
    ReplayTeamWidget& operator=(const ReplayTeamWidget&) = delete;

signals:
    void gotStatus(const Status & status);
    void sendCommand(const Command &command);

    void saveBacklog();
    void enableRecording(bool enabled);
    void enableBackLogLogButton(bool enable);
    void enableLogLogButton(bool enable);
    void setLogLogButton(bool on);
    void setRegularVisualizationsEnabled(bool blue, bool enabled);
    void sendResetDebugPacket(bool blue);

private slots:
    void strategyBlueEnabled(bool enabled);
    void strategyYellowEnabled(bool enabled);

private:
    Ui::ReplayTeamWidget *ui;

    QStringList m_recentScripts;
};

#endif // REPLAYTEAMWIDGET_H
