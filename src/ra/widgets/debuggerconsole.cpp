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

#include "debuggerconsole.h"
#include <QFont>

DebuggerConsole::DebuggerConsole(QWidget *parent) : QPlainTextEdit(parent),
    m_debugSource(amun::StrategyYellow),
    m_debuggerTarget(amun::DITStrategyYellow)
{
    document()->setMaximumBlockCount(100);
    QPalette p = palette();
    p.setColor(QPalette::Base, Qt::black);
    p.setColor(QPalette::Text, Qt::white);
    setPalette(p);
    setUndoRedoEnabled(false);

    const QFont monospaceFont = QFontDatabase::systemFont(QFontDatabase::FixedFont);
    document()->setDefaultFont(monospaceFont);
    setFont(monospaceFont);

    m_line = "";
}

DebuggerConsole::~DebuggerConsole()
{ }

void DebuggerConsole::setStrategy(amun::DebugSource debugSource)
{
    m_debugSource = debugSource;
    m_debuggerTarget = fromDebuggerInput(debugSource);
}

amun::DebuggerInputTarget DebuggerConsole::fromDebuggerInput(amun::DebugSource target)
{
    switch (target) {
    case amun::DebugSource::StrategyYellow:
        return amun::DITStrategyYellow;
    case amun::DebugSource::StrategyBlue:
        return amun::DITStrategyBlue;
    case amun::DebugSource::Autoref:
        return amun::DITAutoref;
    default:
        // just return something
        return amun::DITStrategyYellow;
    }
}

void DebuggerConsole::closeEvent(QCloseEvent *event)
{
    // disable debugger if debugger console is closed
    Command command(new amun::Command);
    amun::CommandDebuggerInput *input = command->mutable_debugger_input();
    input->set_strategy_type(m_debuggerTarget);
    input->mutable_disable();
    emit sendCommand(command);
    event->accept();
}

void DebuggerConsole::handleStatus(const Status &status)
{
    if (status->has_debug()) {
        const amun::DebugValues &debug = status->debug();
        if (debug.source() == m_debugSource && debug.has_debugger_output()) {
            QString line = QString::fromStdString(debug.debugger_output().line());
            outputLine(line);
        }
    }
}

void DebuggerConsole::outputLine(const QString &line)
{
    insertPlainText(line);
    show();
    if (parentWidget() != nullptr) {
        parentWidget()->show();
    }
}

void DebuggerConsole::keyPressEvent(QKeyEvent *e)
{
    switch(e->key()) {
    case Qt::Key_Backspace:
        if (m_line.length() > 0) {
            m_line = m_line.mid(0, m_line.length() - 1);
            QPlainTextEdit::keyPressEvent(e);
        }
        break;
    case Qt::Key_Up:
    case Qt::Key_Down:
        break;
    case Qt::Key_Left:
    case Qt::Key_Right:
        break;
    case Qt::Key_Return:
    case Qt::Key_Enter: // on numpad
    {
        Command command(new amun::Command);
        amun::CommandDebuggerInput *input = command->mutable_debugger_input();
        input->set_strategy_type(m_debuggerTarget);
        input->mutable_queue_line()->set_line(m_line.toStdString());
        emit sendCommand(command);
        m_line = "";
        QPlainTextEdit::keyPressEvent(e);
        break;
    }
    default:
        m_line += e->text();
        QPlainTextEdit::keyPressEvent(e);
    }
}

void DebuggerConsole::mousePressEvent(QMouseEvent *e)
{
    (void)e;
    setFocus();
}

void DebuggerConsole::mouseDoubleClickEvent(QMouseEvent *e)
{
    (void)e;
}
