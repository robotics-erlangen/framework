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

#ifndef LOGFILESELECTIONDIALOG_H
#define LOGFILESELECTIONDIALOG_H

#include <QDialog>
#include <QString>
#include <QList>

#include "protobuf/logfile.pb.h"

namespace Ui {
class LogFileSelectionDialog;
}

class LogFileSelectionDialog : public QDialog
{
    Q_OBJECT

public:
    explicit LogFileSelectionDialog(QWidget *parent = nullptr, bool filter = true);
    ~LogFileSelectionDialog();

public slots:
    void setListContent(const logfile::LogOffer & l);

signals:
    void resultSelected(QString selected);

private slots:
    void onAccept();

private:
    Ui::LogFileSelectionDialog *ui;
    QList<QString> m_paths;
    bool m_filter;
};

#endif // LOGFILESELECTIONDIALOG_H
