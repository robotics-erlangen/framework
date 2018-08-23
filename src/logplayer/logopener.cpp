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
#include "logfile/logfilereader.h"
#include "logfile/visionlogliveconverter.h"
#include "logfile/statussource.h"
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
    m_logFile(nullptr),
    m_packetsSinceOpened(0),
    m_recentFilesMenu(nullptr)
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

    ui->goToLastPosition->setVisible(false);

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
    m_lastFilePositions[m_openFileName] = ui->logManager->getFrame();

    QSettings s;
    s.beginWriteArray("recent files", m_recentFiles.size());
    for (int i = 0;i<m_recentFiles.size();i++) {
        s.setArrayIndex(i);
        s.setValue("filename", m_recentFiles.at(i));
    }
    s.endArray();

    s.beginWriteArray("last positions", m_lastFilePositions.size());
    int i = 0;
    for (QString filename : m_lastFilePositions.keys()) {
        s.setArrayIndex(i++);
        s.setValue("filename", filename);
        s.setValue("position", m_lastFilePositions[filename]);
    }
    s.endArray();
}

void LogOpener::handleStatus(const Status &status)
{
    // around 10 seconds
    if (m_packetsSinceOpened > 5000) {
        ui->goToLastPosition->setVisible(false);
    }
    m_packetsSinceOpened++;
}

void LogOpener::openFile()
{
    QString previousDir;
    // open again in previously used folder
    if (m_logFile != nullptr) {
        m_lastFilePositions[m_openFileName] = ui->logManager->getFrame();
        QFileInfo finfo(m_openFileName);
        previousDir = finfo.dir().path();
    }

    QString filename = QFileDialog::getOpenFileName((QMainWindow*)parent(), "Select log file", previousDir, "Log files (*.log)");
    openFile(filename);
}

void LogOpener::openFile(const QString &filename)
{
    // don't do anything if the user couldn't decide for a new log file
    if (!filename.isEmpty()) {
        QList<std::function<QPair<StatusSource*, QString>(QString)>> openFunctions =
            { &VisionLogLiveConverter::tryOpen, &LogFileReader::tryOpen};
        for (auto openFunction : openFunctions) {
            auto openResult = openFunction(filename);

            if (openResult.first != nullptr) {
                // the logfile was successfully opened
                // the old logfile is deleted by the logmanager
                m_logFile = openResult.first;

                m_openFileName = filename;
                emit logOpened();
                ui->logManager->setStatusSource(m_logFile);

                // move the file to the end of the recent files list
                m_recentFiles.removeAll(filename);
                m_recentFiles.append(filename);
                if (m_recentFiles.size() > MAX_RECENT_FILE_COUNT) {
                    m_recentFiles.removeFirst();
                }
                makeRecentFileMenu();

                // add button to go to the last position (if log is long enough, around 1:30 min)
                if (m_logFile->timings().size() > 50000 &&
                        m_lastFilePositions.contains(filename)) {
                    ui->goToLastPosition->setVisible(true);
                    ui->goToLastPosition->setText(QString::number(m_lastFilePositions[filename]));
                } else {
                    ui->goToLastPosition->setVisible(false);
                }
                m_packetsSinceOpened = 0;

                ((QMainWindow*)parent())->setWindowTitle("Horus - " + QFileInfo(filename).fileName());
                return;

            } else if (!openResult.second.isEmpty()) {
                // the header matched, but the log file is corrupt
                QMessageBox::critical((QMainWindow*)parent(), "Error", openResult.second);
                return;
            }
        }
        QMessageBox::critical((QMainWindow*)parent(), "Error", "Could not open log file - no matching format found");
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
    ui->goToLastPosition->setVisible(false);
    ui->logManager->seekPacket(m_lastFilePositions[m_openFileName]);
}
