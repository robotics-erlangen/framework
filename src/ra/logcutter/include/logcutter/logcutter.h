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

#ifndef LOGCUTTER_H
#define LOGCUTTER_H

#include <QWidget>

namespace Ui {
class LogCutter;
}

class LogProcessor;

class LogCutter : public QWidget
{
    Q_OBJECT

public:
    explicit LogCutter(QWidget *parent = 0);
    ~LogCutter() override;
    LogCutter(const LogCutter&) = delete;
    LogCutter& operator=(const LogCutter&) = delete;

private slots:
    void selectOutputFile();
    void startProcess();

    void updateProgress(const QString& progress);
    void updateError(const QString &error);
    void updateFinished();

    void addSourceFile();
    void removeSourceFile();
    void clearSourceFiles();
private:
    void lockUI(bool lock);

    Ui::LogCutter *ui;
    LogProcessor *m_processor;
};

#endif // LOGCUTTER_H
