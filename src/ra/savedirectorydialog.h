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

#ifndef SAVEDIRECTORYDIALOG_H
#define SAVEDIRECTORYDIALOG_H

#include <QDialog>
#include <QList>
#include <QString>

namespace Ui {
    class SaveDirectoryDialog;
}

class SaveDirectoryDialog : public QDialog
{
    Q_OBJECT

public:
    explicit SaveDirectoryDialog(const QList<QString> &directories, QWidget *parent = nullptr);
    ~SaveDirectoryDialog();
    SaveDirectoryDialog(const SaveDirectoryDialog&) = delete;
    SaveDirectoryDialog& operator=(const SaveDirectoryDialog&) = delete;
    // call this function after the dialog finished with status 'Accepted' to get the resulting list
    QList<QString> getResult();

private slots:
    void addDirectory();
    void removeDirectory();

private:
    Ui::SaveDirectoryDialog *ui;
};

#endif // SAVEDIRECTORYDIALOG_H
