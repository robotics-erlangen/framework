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
#include <QDebug>
#include <QFont>
#include <QScrollBar>

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

    setTextInteractionFlags(Qt::TextSelectableByMouse | Qt::TextEditable);

    m_line = "";
    m_expectedCursorPosition = 0;
    m_inUserInput = false;
    m_atScrollEnd = true;

    connect(document(), SIGNAL(contentsChange(int,int,int)), SLOT(handleDocumentChange(int,int,int)));
    connect(verticalScrollBar(), SIGNAL(valueChanged(int)), SLOT(trackAtScrollEnd()));
    connect(verticalScrollBar(), SIGNAL(rangeChanged(int,int)), SLOT(followScrollResizes()));
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
    for (const amun::DebugValues &debug : status->debug()) {
        if (debug.source() == m_debugSource && debug.has_debugger_output()) {
            QString line = QString::fromStdString(debug.debugger_output().line());
            outputLine(line);
        }
    }
}

void DebuggerConsole::outputLine(const QString &line)
{
    QTextCursor cursor = textCursor();
    cursor.setPosition(m_expectedCursorPosition);
    m_expectedCursorPosition += line.length();
    cursor.insertText(line);
    ensureDockVisible();
}

void DebuggerConsole::trackAtScrollEnd()
{
    m_atScrollEnd = (verticalScrollBar()->value() == verticalScrollBar()->maximum());
}

void DebuggerConsole::followScrollResizes()
{
    if (m_atScrollEnd) {
        verticalScrollBar()->setValue(verticalScrollBar()->maximum());
    }
}

void DebuggerConsole::ensureDockVisible()
{
    show();
    if (parentWidget() != nullptr) {
        parentWidget()->show();
    }
}

void DebuggerConsole::keyPressEvent(QKeyEvent *e)
{
    switch(e->key()) {
    case Qt::Key_Backspace:
        resetCursorPosition();
        if (m_line.length() > 0) {
            processDefaultInput(e);
        }
        break;
    case Qt::Key_Delete:
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
        sendCurrentLine();
        processDefaultInput(e);
        m_line = "";
        break;
    }
    default:
        processDefaultInput(e);
    }
}

void DebuggerConsole::processDefaultInput(QKeyEvent *e)
{
    m_inUserInput = true;
    if (e->matches(QKeySequence::Cut) || e->matches(QKeySequence::Paste)) {
        resetCursorPosition();
    } else if (e->text().length() > 0) {
        resetCursorPosition();
    }
    QPlainTextEdit::keyPressEvent(e);
    m_inUserInput = false;
}

void DebuggerConsole::mouseReleaseEvent(QMouseEvent *e)
{
    fixCursorPosition();
    QPlainTextEdit::mouseReleaseEvent(e);
}

void DebuggerConsole::fixCursorPosition()
{
    if (!textCursor().hasSelection()) {
        resetCursorPosition();
    }
}

void DebuggerConsole::resetCursorPosition()
{
    if (m_expectedCursorPosition != textCursor().position()) {
        QTextCursor cursor = textCursor();
        cursor.setPosition(m_expectedCursorPosition);
        if (cursor.position() != m_expectedCursorPosition) {
            qDebug() << "unexpected document modifications!";
            // something went wrong, make sure we don't break everything ...
            cursor.movePosition(QTextCursor::End);
            m_expectedCursorPosition = cursor.position();
        }
        setTextCursor(cursor);

        // remove any unexpected text
        QTextCursor cleanupCursor = textCursor();
        cleanupCursor.movePosition(QTextCursor::End, QTextCursor::KeepAnchor);
        cleanupCursor.removeSelectedText();
    }
}

void DebuggerConsole::sendCurrentLine()
{
    Command command(new amun::Command);
    amun::CommandDebuggerInput *input = command->mutable_debugger_input();
    input->set_strategy_type(m_debuggerTarget);
    input->mutable_queue_line()->set_line(m_line.toStdString());
    emit sendCommand(command);
}

void DebuggerConsole::handleDocumentChange(int from, int charsRemove, int charsAdded)
{
    if (!m_inUserInput) {
        return;
    }

    int removedLineChars = std::min(m_line.length(), charsRemove);
    m_line = m_line.mid(0, m_line.length() - removedLineChars);
    m_expectedCursorPosition -= removedLineChars;

    // select chars added
    QTextCursor cursor = textCursor();
    cursor.setPosition(from);
    cursor.setPosition(from + charsAdded, QTextCursor::KeepAnchor);

    m_line += cursor.selectedText();
    m_expectedCursorPosition += cursor.selectedText().size();
}

void DebuggerConsole::dragEnterEvent(QDragEnterEvent *e)
{
    // just ignore it
    (void)e;
}

void DebuggerConsole::dragMoveEvent(QDragMoveEvent *e)
{
    // just ignore it
    (void)e;
}

void DebuggerConsole::dragLeaveEvent(QDragLeaveEvent *e)
{
    // just ignore it
    (void)e;
}
