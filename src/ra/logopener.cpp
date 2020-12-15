/***************************************************************************
 *   Copyright 2018 Andreas Wendler                                        *
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

#include "logopener.h"
#include "ui_mainwindow.h"

#include <QSettings>
#include <QSignalMapper>
#include <QFileInfo>
#include <QFileDialog>
#include <QMessageBox>
#include <QAction>
#include <functional>

LogOpener::LogOpener(Ui::MainWindow *ui, QObject *parent) :
    QObject(parent),
    ui(ui),
    m_packetsSinceOpened(0),
    m_recentFilesMenu(nullptr),
    m_showGoToLastPosition(false),
    m_useSettingLocation(false)
{
    QSettings s;
    int recentFileCount = s.beginReadArray("recent files");
    for (int i = 0;i<recentFileCount;i++) {
        s.setArrayIndex(i);
        m_recentFiles.append(s.value("filename").toString());
    }
    s.endArray();
    int lastFilePositionCount = s.beginReadArray("last positions");
    for (int i = 0;i<lastFilePositionCount;i++) {
        s.setArrayIndex(i);
        QString name = s.value("filename").toString();
        uint index = s.value("position").toUInt();
        m_lastFilePositions[name] = index;
    }
    s.endArray();

    makeRecentFileMenu();

    showLastPosition(false);

    connect(ui->field, SIGNAL(fileDropped(QString)), SLOT(openFile(QString)));

    // setup icons
    ui->btnOpen->setIcon(QIcon::fromTheme("document-open"));

    // connect buttons, ...
    connect(ui->btnOpen, SIGNAL(clicked()), SLOT(openFile()));
    connect(ui->goToLastPosition, SIGNAL(clicked(bool)), SLOT(goToLastFilePosition()));
    connect(ui->actionOpen_Logfile, SIGNAL(triggered()), SLOT(openFile()));
}

void LogOpener::close()
{
    saveCurrentPosition();
    saveConfig();
}

void LogOpener::saveConfig()
{
    QSettings s;
    s.beginWriteArray("recent files", m_recentFiles.size());
    for (int i = 0;i<m_recentFiles.size();i++) {
        s.setArrayIndex(i);
        s.setValue("filename", m_recentFiles.at(i));
    }
    s.endArray();

    s.beginWriteArray("last positions", m_lastFilePositions.size());
    int i = 0;
    for (const QString &filename : m_lastFilePositions.keys()) {
        s.setArrayIndex(i++);
        s.setValue("filename", filename);
        s.setValue("position", m_lastFilePositions[filename]);
    }
    s.endArray();
}

void LogOpener::showLastPosition(bool show)
{
    m_showGoToLastPosition = show;
    ui->goToLastPosition->setVisible(show);
}

void LogOpener::handleStatus(const Status& status)
{
    if (status->has_pure_ui_response()) {
        const auto& response = status->pure_ui_response();
        if (response.has_log_open() && response.log_open().success()) {
            saveCurrentPosition();
            m_isValid = true;

            m_openFileName = m_prelimFileName;

            // move the file to the end of the recent files list
            m_recentFiles.removeAll(m_openFileName);
            m_recentFiles.append(m_openFileName);
            if (m_recentFiles.size() > MAX_RECENT_FILE_COUNT) {
                m_recentFiles.removeFirst();
            }
            makeRecentFileMenu();
        }
        if (response.has_log_info()) {
            activateLastPosition(response.log_info().packet_count());
        }
    }

    // around 10 seconds
    if (m_packetsSinceOpened > 5000) {
        showLastPosition(false);
    }
    m_packetsSinceOpened++;
}

void LogOpener::useLogfileLocation(bool enabled)
{
    m_useSettingLocation = enabled;
}

void LogOpener::openFile()
{
    QString previousDir;
    QSettings s;
    s.beginGroup("LogLocation");
    if (m_useSettingLocation) {
        int size = s.beginReadArray("locations");
        if (size > 0) {
            s.setArrayIndex(0);
            previousDir = s.value("path").toString();
        }
        s.endArray();
        s.endGroup();
    }
    // open again in previously used folder
    if (m_isValid) {
        QFileInfo finfo(m_openFileName);
        previousDir = finfo.dir().path();
    }

    QString filename = QFileDialog::getOpenFileName((QMainWindow*)parent(), "Select log file", previousDir, "Log files (*.log)");
    openFile(filename);
}

void LogOpener::saveCurrentPosition()
{
    if (m_isValid) {
        m_lastFilePositions[m_openFileName] = ui->logManager->getFrame();
    }
    m_isValid = false;
}

void LogOpener::activateLastPosition(int numPackets)
{
    // TODO: How to avoid triggering for backlogs? They are small, but is that for eternity?

    // add button to go to the last position (if log is long enough, around 1:30 min)
    if (numPackets > 50000 && m_lastFilePositions.contains(m_openFileName)) {
        showLastPosition(true);
        ui->goToLastPosition->setText(QString::number(m_lastFilePositions[m_openFileName]));
    } else {
        showLastPosition(false);
    }

    m_packetsSinceOpened = 0;
}

void LogOpener::openFile(const QString &filename)
{
    // don't do anything if the user couldn't decide for a new log file
    if (!filename.isEmpty()) {
        m_prelimFileName = filename; // Also FIXME: this is a relative path, an absolte path, an absolute mess, ...
        Command command(new amun::Command);
        command->mutable_playback()->mutable_log_path()->set_path(filename.toStdString());
        emit sendCommand(command);
    }
}

void LogOpener::makeRecentFileMenu()
{
    if (m_recentFiles.size() > 0) {
        QMenu *newMenu = new QMenu("Recent files", ui->menuFile);
        if (m_recentFilesMenu == nullptr) {
            m_recentFilesMenuAction = ui->menuFile->insertMenu(ui->actionLogCutter, newMenu);
            ui->menuFile->insertSeparator(ui->actionLogCutter);
        } else {
            // just remove the old one and create a new one
            m_recentFilesMenuAction = ui->menuFile->insertMenu(m_recentFilesMenuAction, newMenu);
            m_recentFilesMenu->deleteLater();
        }
        m_recentFilesMenu = newMenu;
        QSignalMapper *mapper = new QSignalMapper(newMenu);
        connect(mapper, SIGNAL(mapped(QString)), SLOT(openFile(QString)));
        for (int i = m_recentFiles.size()-1;i>=0;i--) {
            QFileInfo file(m_recentFiles[i]);
            QString fileName = file.fileName();
            QAction *fileAction = new QAction(fileName, newMenu);
            newMenu->addAction(fileAction);
            connect(fileAction, SIGNAL(triggered()), mapper, SLOT(map()));
            mapper->setMapping(fileAction, m_recentFiles[i]);
        }
    }
}

void LogOpener::goToLastFilePosition()
{
    showLastPosition(false);
    ui->logManager->seekPacket(m_lastFilePositions[m_openFileName]);
}
