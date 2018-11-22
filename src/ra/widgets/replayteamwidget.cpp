#include <QSettings>
#include "replayteamwidget.h"
#include "ui_replayteamwidget.h"
#include "protobuf/status.pb.h"

ReplayTeamWidget::ReplayTeamWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::ReplayTeamWidget)
{
    ui->setupUi(this);
    ui->blue->init(amun::StatusStrategyWrapper::REPLAY_BLUE);
    ui->yellow->init(amun::StatusStrategyWrapper::REPLAY_YELLOW);
    QSettings s;
    s.beginGroup("Strategy");
    m_recentScripts = s.value("RecentScripts").toStringList();
    s.endGroup();

    ui->blue->setRecentScripts(&m_recentScripts);
    ui->yellow->setRecentScripts(&m_recentScripts);
    ui->blue->load();
    ui->yellow->load();

    connect(ui->replayBlue, SIGNAL(clicked(bool)), ui->blue, SLOT(setEnabled(bool)));
    connect(ui->replayYellow, SIGNAL(clicked(bool)), ui->yellow, SLOT(setEnabled(bool)));
    connect(ui->replayBlue, SIGNAL(clicked(bool)), this, SLOT(strategyBlueEnabled(bool)));
    connect(ui->replayYellow, SIGNAL(clicked(bool)), this, SLOT(strategyYellowEnabled(bool)));

    connect(ui->blue, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
    connect(ui->yellow, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
    connect(this, SIGNAL(gotStatus(Status)), ui->blue, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatus(Status)), ui->yellow, SLOT(handleStatus(Status)));

    connect(ui->backloglog, SIGNAL(clicked()), this, SIGNAL(saveBacklog()));
    connect(ui->loglog, SIGNAL(clicked(bool)), this, SIGNAL(enableRecording(bool)));
    connect(this, SIGNAL(enableLogLogButton(bool)), ui->loglog, SLOT(setEnabled(bool)));
    connect(this, SIGNAL(enableBackLogLogButton(bool)), ui->backloglog, SLOT(setEnabled(bool)));
    connect(this, SIGNAL(setLogLogButton(bool)), ui->loglog, SLOT(setChecked(bool)));

    ui->blue->enableDebugger(false);
    ui->yellow->enableDebugger(false);
}

ReplayTeamWidget::~ReplayTeamWidget()
{
    QSettings s;
    s.beginGroup("Strategy");
    s.setValue("RecentScripts", m_recentScripts);
    s.endGroup();
    delete ui;
}

void ReplayTeamWidget::strategyBlueEnabled(bool enabled)
{
    Command command(new amun::Command);
    command->mutable_replay()->set_enable_blue_strategy(enabled);
    emit sendCommand(command);
    if (enabled) {
        emit sendResetDebugPacket(true);
    }
    emit setRegularVisualizationsEnabled(true, !enabled);
}

void ReplayTeamWidget::strategyYellowEnabled(bool enabled)
{
    Command command(new amun::Command);
    command->mutable_replay()->set_enable_yellow_strategy(enabled);
    emit sendCommand(command);
    if (enabled) {
        emit sendResetDebugPacket(false);
    }
    emit setRegularVisualizationsEnabled(false, !enabled);
}
