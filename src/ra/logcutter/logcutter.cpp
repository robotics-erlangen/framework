/***************************************************************************
 *   Copyright 2020 Michael Eischer, Andreas Wendler                       *
 *   Robotics Erlangen e.V.                                                *
 *   http://www.robotics-erlangen.de/                                      *
 *   info@robotics-erlangen.de                                             *
 *                                                                         *
 *   This program is free software: you can redistribute it and/or modify  *
 *   it under the terms of the GNU General Public License as published by  *
 *   the Free Software Foundation, either version 3 of the License, or     *
 *   any later version.                                                    *
 *                                                                         *
 *   This program is distributed in the hope that it will be useful,       *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of        *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the         *
 *   GNU General Public License for more details.                          *
 *                                                                         *
 *   You should have received a copy of the GNU General Public License     *
 *   along with this program.  If not, see <http://www.gnu.org/licenses/>. *
 ***************************************************************************/

#include "logcutter.h"
#include "ui_logcutter.h"
#include "logprocessor.h"

#include <QFileDialog>

LogCutter::LogCutter(QWidget *parent) :
    QWidget(parent, Qt::Window),
    ui(new Ui::LogCutter),
    m_processor(nullptr)
{
    ui->setupUi(this);

    connect(ui->outputSelectBtn, &QToolButton::clicked, this, &LogCutter::selectOutputFile);
    connect(ui->processBtn, &QPushButton::clicked, this, &LogCutter::startProcess);

    connect(ui->sourceAddBtn, &QPushButton::clicked, this, &LogCutter::addSourceFile);
    connect(ui->sourceRemoveBtn, &QPushButton::clicked, this, &LogCutter::removeSourceFile);
    connect(ui->sourceClearBtn, &QPushButton::clicked, this, &LogCutter::clearSourceFiles);
}

LogCutter::~LogCutter()
{
    delete ui;
}

void LogCutter::addSourceFile()
{
    QString path = QFileDialog::getOpenFileName(this, tr("Source logfile"), QString(), tr("Log file (*.log)"));
    ui->inputList->addItem(path);
}

void LogCutter::removeSourceFile()
{
    qDeleteAll(ui->inputList->selectedItems());
}

void LogCutter::clearSourceFiles()
{
    ui->inputList->clear();
}

void LogCutter::selectOutputFile()
{
    QString path = QFileDialog::getSaveFileName(this, tr("Output logfile"), ui->outputFile->text(), tr("Log file (*.log)"));
    if (!path.isNull()) {
        ui->outputFile->setText(path);
    }
}

void LogCutter::startProcess()
{
    lockUI(true);

    QList<QString> inputFiles;
    inputFiles.reserve(ui->inputList->count());
    for (int i = 0; i < ui->inputList->count(); ++i) {
        inputFiles.append(ui->inputList->item(i)->text());
    }
    QString outputFile = ui->outputFile->text();

    LogProcessor::Options options = LogProcessor::NoOptions;
    if (ui->cutHaltChk->isChecked()) {
        options |= LogProcessor::CutHalt;
    }
    if (ui->cutNonGameChk->isChecked()) {
        options |= LogProcessor::CutNonGame;
    }
    if (ui->cutStop->isChecked()) {
        options |= LogProcessor::CutStop;
    }
    if (ui->cutBallplacement->isChecked()) {
        options |= LogProcessor::CutBallplacement;
    }
    if (ui->cutSimulated->isChecked()) {
        options |= LogProcessor::CutSimulated;
    }
    if (ui->cutGit->isChecked()) {
        options |= LogProcessor::CutGit;
    }

    m_processor = new LogProcessor(inputFiles, outputFile, options, this);
    connect(m_processor, &LogProcessor::progressUpdate, this, &LogCutter::updateProgress);
    connect(m_processor, &LogProcessor::error, this, &LogCutter::updateError);
    connect(m_processor, &LogProcessor::finishedProcessing, this, &LogCutter::updateFinished);

    m_processor->start();
    ui->progressLbl->setText("Loading logfiles");
}

void LogCutter::updateProgress(const QString& progress)
{
    ui->progressLbl->setText(progress);
}

void LogCutter::updateError(const QString &error)
{
    ui->progressLbl->setText(error);
    lockUI(false);
}

void LogCutter::updateFinished()
{
    // cleanup processor
    m_processor->wait();
    delete m_processor;
    m_processor = nullptr;

    ui->progressLbl->setText("Idle");
    lockUI(false);
}

void LogCutter::lockUI(bool lock)
{
    ui->processBtn->setEnabled(!lock);
}
