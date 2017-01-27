#include <QSettings>
#include "replayteamwidget.h"
#include "ui_replayteamwidget.h"

ReplayTeamWidget::ReplayTeamWidget(QWidget *parent) :
    QWidget(parent),
    ui(new Ui::ReplayTeamWidget)
{
    ui->setupUi(this);
    ui->blue->init(true);
    ui->yellow->init(false);
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
    connect(ui->replayBlue, SIGNAL(clicked(bool)), this, SIGNAL(enableStrategyBlue(bool)));
    connect(ui->replayYellow, SIGNAL(clicked(bool)), this, SIGNAL(enableStrategyYellow(bool)));

    connect(ui->blue, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
    connect(ui->yellow, SIGNAL(sendCommand(Command)), this, SIGNAL(sendCommand(Command)));
    connect(this, SIGNAL(gotStatusBlue(Status)), ui->blue, SLOT(handleStatus(Status)));
    connect(this, SIGNAL(gotStatusYellow(Status)), ui->yellow, SLOT(handleStatus(Status)));

    connect(this, SIGNAL(enableCheckboxBlue(bool)), ui->replayBlue, SLOT(setChecked(bool)));
    connect(this, SIGNAL(enableCheckboxYellow(bool)), ui->replayYellow, SLOT(setChecked(bool)));
}

ReplayTeamWidget::~ReplayTeamWidget()
{
    QSettings s;
    s.beginGroup("Strategy");
    s.setValue("RecentScripts", m_recentScripts);
    s.endGroup();
    delete ui;
}

void ReplayTeamWidget::handleStatus(const Status &status)
{
    if (ui->replayBlue->isChecked()) {
        emit gotStatusBlue(status);
    }
    if (ui->replayYellow->isChecked()) {
        emit gotStatusYellow(status);
    }
}

bool ReplayTeamWidget::replayBlueEnabled() const
{
    return ui->replayBlue->isChecked();
}

bool ReplayTeamWidget::replayYellowEnabled() const
{
    return ui->replayYellow->isChecked();
}
