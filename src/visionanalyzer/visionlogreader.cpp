/***************************************************************************
 *   Copyright 2016 Alexander Danzer                                       *
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

#include "visionlogreader.h"
#include <QCoreApplication>
#include <QtDebug>
#include <QtEndian>
#include <fstream>
#include "protobuf/ssl_wrapper.pb.h"
#include <iomanip>
#include <utility>

struct FileHeader
{
    char name[12]; // "SSL_LOG_FILE"
    int32_t version; // Default file format is version 1
};

const char* DEFAULT_FILE_HEADER_NAME = "SSL_LOG_FILE";

struct DataHeader
{
    int64_t timestamp; // Timestamp in ns
    int32_t messageType; // Message type
    int32_t messageSize; // Size of protobuf message in bytes
};


VisionLogReader::VisionLogReader(const QString& filename):
    QObject()
{
    const char *fname = filename.toLatin1().data();;
    in_stream = new std::ifstream(fname, std::ios_base::in | std::ios_base::binary);
    if (!in_stream->is_open()) {
        std::cerr << "Error opening log file \"" << fname << "\"!" << std::endl;
        QCoreApplication::exit(1);
    }

    FileHeader fileHeader;
    in_stream->read((char*) &fileHeader, sizeof(fileHeader));
    // Log data is stored big endian, convert to host byte order
    fileHeader.version = qFromBigEndian(fileHeader.version);

    if (strncmp(fileHeader.name, DEFAULT_FILE_HEADER_NAME, sizeof(fileHeader.name)) != 0) {
        qWarning() << "Unrecognized logfile header";
        QCoreApplication::exit(1);
    }
}


std::pair<qint64, int> VisionLogReader::nextVisionPacket(QByteArray& data)
{
    DataHeader dataHeader;
    while (!in_stream->eof()) {
        in_stream->read((char*) &dataHeader, sizeof(dataHeader));
        if (in_stream->eof()) {
            return std::make_pair(-1,-1);
        }

        // Log data is stored big endian, convert to host byte order
        dataHeader.timestamp = qFromBigEndian((qint64)dataHeader.timestamp);
        dataHeader.messageType = qFromBigEndian(dataHeader.messageType);
        dataHeader.messageSize = qFromBigEndian(dataHeader.messageSize);

        char buffer[dataHeader.messageSize];
        in_stream->read(buffer, dataHeader.messageSize);

        data = QByteArray(buffer, dataHeader.messageSize);
        return std::make_pair(dataHeader.timestamp, dataHeader.messageType);
    }
    return std::make_pair(-1,-1);
}

VisionLogReader::~VisionLogReader()
{
    delete in_stream;
}
