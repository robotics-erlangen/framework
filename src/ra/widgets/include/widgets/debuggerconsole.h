/***************************************************************************
 *   Copyright 2017 Michael Eischer                                        *
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

#ifndef DEBUGGERCONSOLE_H
#define DEBUGGERCONSOLE_H

#include <QString>
#include <QPlainTextEdit>
#include "protobuf/command.h"
#include "protobuf/status.h"

class DebuggerConsole : public QPlainTextEdit
{
    Q_OBJECT

public:
    explicit DebuggerConsole(QWidget *parent = 0);
    ~DebuggerConsole();
    DebuggerConsole(const DebuggerConsole&) = delete;
    DebuggerConsole& operator=(const DebuggerConsole&) = delete;

    void setStrategy(amun::DebugSource debugSource);

public slots:
    void handleStatus(const Status &status);

signals:
    void sendCommand(const Command &command);

protected:
    void closeEvent(QCloseEvent *event);
    void keyPressEvent(QKeyEvent *e);
    void mouseReleaseEvent(QMouseEvent *e);
    void dragEnterEvent(QDragEnterEvent *e);
    void dragMoveEvent(QDragMoveEvent *e);
    void dragLeaveEvent(QDragLeaveEvent *e);

private slots:
    void fixCursorPosition();
    void resetCursorPosition();
    void handleDocumentChange(int from, int charsRemove, int charsAdded);
    void trackAtScrollEnd();
    void followScrollResizes();

private:
    amun::DebuggerInputTarget fromDebuggerInput(amun::DebugSource target);
    void outputLine(const QString &line);
    void ensureDockVisible();
    void sendCurrentLine();
    void processDefaultInput(QKeyEvent *e);

    QString m_line;
    amun::DebugSource m_debugSource;
    amun::DebuggerInputTarget m_debuggerTarget;

    int m_expectedCursorPosition;
    bool m_inUserInput;
    bool m_atScrollEnd;
};

#endif // DEBUGGERCONSOLE_H
