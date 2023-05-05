/***************************************************************************
 *   Copyright 2023 Paul Bergmann                                          *
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
#ifndef AUTOMATICENTRYPOINTDIALOG_H
#define AUTOMATICENTRYPOINTDIALOG_H

#include "protobuf/status.pb.h"
#include <QDialog>
#include "automaticentrypointsstorage.h"

namespace Ui {
class AutomaticEntrypointDialog;
}

class EntrypointSelectionToolButton;
class QCheckBox;
class QString;
template<typename T>
class QVector;

class AutomaticEntrypointDialog : public QDialog
{
    Q_OBJECT

public:
    explicit AutomaticEntrypointDialog(const AutomaticEntrypointsStorage &selectedEntrypoints, const QVector<QString> &allEntrypoints, amun::StatusStrategyWrapper::StrategyType type, QWidget *parent = nullptr);
    ~AutomaticEntrypointDialog();

    AutomaticEntrypointsStorage selectedEntrypoints() const { return m_selectedEntrypoints; };
private:
    void addEntrypointSelection(int row, QCheckBox *enabledBox, EntrypointSelectionToolButton *toolButton, const QVector<QString> &allEntrypoints, QString& valueStorage);

private:
    Ui::AutomaticEntrypointDialog *ui;
    AutomaticEntrypointsStorage m_selectedEntrypoints;
};

#endif // AUTOMATICENTRYPOINTDIALOG_H
