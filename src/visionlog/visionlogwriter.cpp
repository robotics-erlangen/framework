/***************************************************************************
 *   Copyright 2018 Tobias Heineken                                        *
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

#include "visionlogwriter.h"
#include "visionlogheader.h"
#include "messagetype.h"

#include <fstream>
#include <cstring>
#include <QtEndian>
#include <QByteArray>

VisionLogWriter::VisionLogWriter(const QString& filename):
    QObject()
{
    const char *fname = filename.toUtf8().data();;
    out_stream = new std::ofstream(fname, std::ios_base::out | std::ios_base::binary);
    if (!out_stream->is_open()) {
        std::cerr << "Error opening log file \"" << fname << "\"!" << std::endl;
        exit(1);
    }

    VisionLog::FileHeader fileHeader;
    fileHeader.version = 1;
    strncpy(fileHeader.name, VisionLog::DEFAULT_FILE_HEADER_NAME, sizeof(fileHeader.name));
    // Log data is stored big endian, convert from host byte order
    fileHeader.version = qToBigEndian(fileHeader.version);

    out_stream->write((char*) &fileHeader, sizeof(fileHeader));
}

VisionLogWriter::~VisionLogWriter()
{
    delete out_stream;
}

void VisionLogWriter::addVisionPacket(const SSL_DetectionFrame& frame)
{
    QByteArray data;
    data.resize(frame.ByteSize());
    if (!frame.IsInitialized()){
        qFatal("Writing an uninitialized detectionFrame to Vision log");
    }
    if (!frame.SerializeToArray(data.data(), data.size())){
        qFatal("Writing to array failed in %s (%s:%d)", __func__, __FILE__, __LINE__);
    }

    VisionLog::DataHeader dataHeader;
    dataHeader.timestamp = time;
    dataHeader.messageType = VisionLog::MESSAGE_SSL_VISION_2014;
    dataHeader.messageSize = data.size();


    // Log data is stored big endian, convert from host byte order
    // converting to qint64 is necessary for 64 bit
    qint64 timestamp = dataHeader.timestamp;
    dataHeader.timestamp = qToBigEndian(timestamp);
    dataHeader.messageType = qToBigEndian(dataHeader.messageType);
    dataHeader.messageSize = qToBigEndian(dataHeader.messageSize);

    out_stream->write((char*) &dataHeader, sizeof(dataHeader));

    out_stream->write(data.constData(), data.size());
}

void VisionLogWriter::passTime()
{
    time += 10000000;
}
