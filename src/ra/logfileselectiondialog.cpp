/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#include "logfileselectiondialog.h"
#include "ui_logfileselectiondialog.h"

LogFileSelectionDialog::LogFileSelectionDialog(QWidget *parent) :
    QDialog(parent),
    ui(new Ui::LogFileSelectionDialog)
{
    ui->setupUi(this);
    setWindowTitle("Select Logfile");
    connect(ui->resultButtons, SIGNAL(accepted()), this, SLOT(onAccept()));
    connect(ui->resultButtons, SIGNAL(rejected()), this, SLOT(reject()));
    connect(ui->list, SIGNAL(itemDoubleClicked(QListWidgetItem*)), this, SLOT(onAccept()));
}

LogFileSelectionDialog::~LogFileSelectionDialog()
{
    delete ui;
}

void LogFileSelectionDialog::setListContent(const logfile::LogOffer &l)
{
    ui->list->clear();
    paths = {};
    const auto& qualityDescriptor = logfile::LogOfferEntry::QUALITY_descriptor();
    for (const auto& item : l.entries()) {
        ui->list->addItem(QString::fromStdString(item.name() + "(" + qualityDescriptor->FindValueByNumber(item.quality())->name() + ")"));
        paths.append(QString::fromStdString(item.uri().path()));
    }
}

void LogFileSelectionDialog::onAccept()
{
    emit resultSelected(paths[ui->list->currentRow()]);
    accept();
}
