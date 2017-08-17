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
    bool replayBlueEnabled() const;
    bool replayYellowEnabled() const;

signals:
    void gotStatus(const Status & status);
    void sendCommand(const Command &command);
    void enableStrategyBlue(bool enabled);
    void enableStrategyYellow(bool enabled);

    void saveBacklog();
    void enableRecording(bool enabled);
    void enableBackLogLogButton(bool enable);
    void enableLogLogButton(bool enable);
    void setLogLogButton(bool on);

private:
    Ui::ReplayTeamWidget *ui;

    QStringList m_recentScripts;
};

#endif // REPLAYTEAMWIDGET_H
