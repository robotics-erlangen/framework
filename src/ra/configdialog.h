/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef CONFIGDIALOG_H
#define CONFIGDIALOG_H

#include "protobuf/command.h"
#include "robotuiaction.h"
#include <QDialog>

class QAbstractButton;

namespace Ui {
class ConfigDialog;
}

class ConfigDialog : public QDialog
{
    Q_OBJECT

public:
    explicit ConfigDialog(QWidget *parent = nullptr);
    ~ConfigDialog() override;
    ConfigDialog(const ConfigDialog&) = delete;
    ConfigDialog& operator=(const ConfigDialog&) = delete;
    bool numKeysUsedForReferee() const;

signals:
    void sendCommand(const Command &command);
    void useNumKeysForReferee(bool forReferee); // simulator speed otherwise
    void setRobotDoubleClickAction(FieldWidgetAction action, QString searchString);
    void setRobotCtrlClickAction(FieldWidgetAction action, QString searchString);
	void setPalette(QPalette palette);
    void setScrollSensitivity(float sensitivity);

public slots:
    void load();

private slots:
    void clicked(QAbstractButton *button);
    void changedPalette(int newIndex);

private:
    void sendConfiguration();
    void reset();
    void apply();
    static QString robotActionString(FieldWidgetAction action);

    Ui::ConfigDialog *ui;
    QString m_defaultVersionString;
    QPalette m_defaultPalette;
};

#endif // CONFIGDIALOG_H
