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

public slots:
    void handleStatus(const Status &status);

signals:
    void sendCommand(const Command &command);
    void gotStatusBlue(const Status & status);
    void gotStatusYellow(const Status & status);
    void enableStrategyBlue(bool enabled);
    void enableStrategyYellow(bool enabled);
    void enableCheckboxBlue(bool enable);
    void enableCheckboxYellow(bool enable);

private:
    Ui::ReplayTeamWidget *ui;

    QStringList m_recentScripts;
};

#endif // REPLAYTEAMWIDGET_H
