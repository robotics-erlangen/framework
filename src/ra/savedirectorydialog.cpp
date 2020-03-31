/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#include "savedirectorydialog.h"
#include "ui_savedirectorydialog.h"

#include <QFileDialog>

SaveDirectoryDialog::SaveDirectoryDialog(const QList<QString> &directories, QWidget *parent) :
    QDialog(parent),
    ui(new Ui::SaveDirectoryDialog)
{
    ui->setupUi(this);
    setWindowTitle("Choose logfile directories");
    ui->directoryList->addItems(directories);
    connect(ui->addButton, SIGNAL(clicked()), this, SLOT(addDirectory()));
    connect(ui->removeButton, SIGNAL(clicked()), this, SLOT(removeDirectory()));
}

SaveDirectoryDialog::~SaveDirectoryDialog()
{
    delete ui;
}

void SaveDirectoryDialog::addDirectory()
{
    QString dir = QFileDialog::getExistingDirectory(this, tr("Open Directory"), QString(),
                                                    QFileDialog::ShowDirsOnly | QFileDialog::DontResolveSymlinks);
    if (!dir.isEmpty()) {
        ui->directoryList->addItem(dir);
    }
}

void SaveDirectoryDialog::removeDirectory()
{
    qDeleteAll(ui->directoryList->selectedItems());
}

QList<QString> SaveDirectoryDialog::getResult()
{
    QList<QString> result;
    for (int i = 0; i < ui->directoryList->count(); ++i) {
        result.append(ui->directoryList->item(i)->text());
    }
    return result;
}
