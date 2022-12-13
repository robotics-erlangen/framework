/***************************************************************************
 *   Copyright 2020 Andreas Wendler                                        *
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

#ifndef PROTOBUFFILESAVER_H
#define PROTOBUFFILESAVER_H

#include <google/protobuf/message.h>
#include <QDataStream>
#include <QFile>
#include <QMutex>
#include <QObject>
#include <QString>

class ProtobufFileSaver : QObject
{
    Q_OBJECT
public:
    // The file is created once saveMessage is called for the first time
    ProtobufFileSaver(QString filename, QString filePrefix, QObject *parent = nullptr);

    // may be called from any thread
    void saveMessage(const google::protobuf::Message &message);

    void close() { m_file.close(); }

private:
    void open();

private:
    QString m_filename;
    QString m_filePrefix;
    QFile m_file;
    QDataStream m_stream;
    QMutex m_mutex;
};

#endif // PROTOBUFFILESAVER_H
