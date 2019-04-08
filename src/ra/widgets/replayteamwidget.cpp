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

    ui->blue->enableDebugger(false);
    ui->yellow->enableDebugger(false);
}

ReplayTeamWidget::~ReplayTeamWidget()
{
    delete ui;
}

void ReplayTeamWidget::setRecentScriptList(const std::shared_ptr<QStringList> &list)
{
    ui->blue->setRecentScripts(list);
    ui->yellow->setRecentScripts(list);
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
