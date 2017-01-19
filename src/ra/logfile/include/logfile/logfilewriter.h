/***************************************************************************
 *   Copyright 2015 Michael Eischer                                        *
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

#ifndef LOGFILEWRITER_H
#define LOGFILEWRITER_H

#include "protobuf/status.h"
#include <QObject>
#include <QString>
#include <QDataStream>
#include <QFile>

class QMutex;

class LogFileWriter : public QObject
{
    Q_OBJECT
public:
    explicit LogFileWriter();
    ~LogFileWriter() override;

    bool open(const QString &filename);
    void close();
    bool isOpen() const { return m_file.isOpen(); }

    QString filename() const { return m_file.fileName(); }

public slots:
    bool writeStatus(const Status &status);

private:
    void writePackageEntry(qint64 time, const QByteArray &data);

    mutable QMutex *m_mutex;
    QFile m_file;
    QDataStream m_stream;
    QByteArray m_packageBuffer;
    int m_packageBufferCount;

    const static qint32 GROUPED_PACKAGES = 100;
    qint32 m_packageBufferOffsets[GROUPED_PACKAGES];
};

#endif // LOGFILEWRITER_H
