/***************************************************************************
 *   Copyright 2019 Andreas Wendler                                        *
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

#include <QCoreApplication>
#include <QCommandLineParser>
#include <QMap>
#include <QString>
#include <QDebug>
#include <clocale>

#include "seshat/logfilereader.h"


static void ablateStatusRecursive(google::protobuf::Message *message, QList<int> &ablationInfo, int ablationPos)
{
    const google::protobuf::Reflection *refl = message->GetReflection();
    const google::protobuf::Descriptor *desc = message->GetDescriptor();
    const google::protobuf::FieldDescriptor *field = desc->field(ablationInfo[ablationPos]);
    if (ablationPos == ablationInfo.size() - 1) {
        refl->ClearField(message, field);
    } else {
        if (field->is_repeated()) {
            for (int i = 0;i<refl->FieldSize(*message, field);i++) {
                ablateStatusRecursive(refl->MutableRepeatedMessage(message, field, i), ablationInfo, ablationPos+1);
            }
        } else {
            if (refl->HasField(*message, field)) {
                ablateStatusRecursive(refl->MutableMessage(message, field), ablationInfo, ablationPos+1);
            }
        }
    }
}

static unsigned long multipleStatusSize(QList<Status> &packets)
{
    QByteArray buffer;
    for (const Status &status : packets) {
        QByteArray onePacket;
        onePacket.resize(status->ByteSize());
        status->SerializePartialToArray(onePacket.data(), onePacket.size());
        buffer.append(onePacket);
    }
    return qCompress(buffer).size();
}

static unsigned long ablateMultipleStatus(const QList<Status> &statusList, QList<int> &ablationInfo)
{
    QList<Status> temp;
    for (const Status &status : statusList) {
        Status statusCopy(new amun::Status(*status));
        ablateStatusRecursive(&*statusCopy, ablationInfo, 0);
        temp.push_back(statusCopy);
    }
    return multipleStatusSize(temp);
}

static QMap<QString, double> testAblations(const QList<Status> &packets, QList<int> ablation, QString prefix, const google::protobuf::Descriptor *desc, unsigned long fullSize)
{
    QMap<QString, double> result;
    for (int i = 0; i < desc->field_count(); i++) {
        const google::protobuf::FieldDescriptor *field = desc->field(i);

        QList<int> ablationCopy = ablation;
        ablationCopy.push_back(i);
        unsigned long directAblationSize = std::max(long(fullSize) - long(ablateMultipleStatus(packets, ablationCopy)), 0L);
        if (directAblationSize == 0) {
            continue;
        }
        QString totalFieldName = prefix + "/" + QString::fromStdString(field->name());
        if (field->cpp_type() == google::protobuf::FieldDescriptor::CPPTYPE_MESSAGE) {
            QMap<QString, double> partAblations = testAblations(packets, ablationCopy, totalFieldName, field->message_type(), fullSize);
            double partSum = 0;
            for (double size : partAblations) {
                partSum += size;
            }
            for (const QString &key : partAblations.keys()) {
                result[key] = partSum == 0.0 ? 0.0 : directAblationSize * partAblations[key] / partSum;
            }
        } else {
            result[totalFieldName] = directAblationSize;
        }
    }
    return result;
}

static void saveResults(QString filename, const QMap<QString, double> &fieldSizes)
{
    QFile file(filename);
    file.open(QFile::WriteOnly);
    QTextStream stream(&file);
    for (const QString &key : fieldSizes.keys()) {
        QStringList parts = key.split("/");
        for (auto i = parts.size()-1;i>=0;i--) {
            if (!parts[i].isEmpty()) {
                stream <<parts[i]<<endl;
            }
        }
        stream <<"\t"<<static_cast<long>(fieldSizes[key])<<endl;
    }
}

static void ablateAtOffset(int offset, QMap<QString, double> &fieldSizes, LogFileReader &logfile)
{
    QList<Status> packets;
    for (int b = 0;b<logfile.groupSize();b++) {
        packets.push_back(logfile.readStatus(offset + b));
    }
    unsigned long fullSize = multipleStatusSize(packets);
    QMap<QString, double> partialSizes = testAblations(packets, {}, "", amun::Status::descriptor(), fullSize);
    for (const QString &key : partialSizes.keys()) {
        fieldSizes[key] += partialSizes[key];
    }
}

static void ablate(QString filename, LogFileReader &logfile, bool showProgress, bool saveTemporaryResults)
{
    qint32 packetGroupSize = logfile.groupSize();

    QMap<QString, double> fieldSizes;

    int lastPercent = -1;
    for (int i = 0;i<logfile.packetCount();i+=packetGroupSize) {
        if (showProgress) {
            int percent = 100 * i / logfile.packetCount();
            if (percent != lastPercent) {
                qDebug() <<percent<<"%";
                lastPercent = percent;
            }
        }

        ablateAtOffset(i, fieldSizes, logfile);

        if (i % 10 == 0 && saveTemporaryResults) {
            saveResults(filename, fieldSizes);
        }
    }
    saveResults(filename, fieldSizes);
}

static void ablateRandomized(QString filename, LogFileReader &logfile, int iterations, bool showProgress, bool saveTemporaryResults)
{
    QMap<QString, double> fieldSizes;

    int lastPercent = -1;
    for (int i = 0;i<iterations;i++) {
        if (showProgress) {
            int percent = 100 * i / iterations;
            if (percent != lastPercent) {
                qDebug() <<percent<<"%";
                lastPercent = percent;
            }
        }

        ablateAtOffset(rand() % (logfile.packetCount() - logfile.groupSize()), fieldSizes, logfile);

        if (i % 10 == 0 && saveTemporaryResults) {
            saveResults(filename, fieldSizes);
        }
    }
    saveResults(filename, fieldSizes);
}

int main(int argc, char* argv[])
{
    QCoreApplication app(argc, argv);
    app.setApplicationName("Loganalyzer");
    app.setOrganizationName("ER-Force");

    std::setlocale(LC_NUMERIC, "C");

    QCommandLineParser parser;
    parser.setApplicationDescription("Tool to analyze the memory usage in ER-Force log files");
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("logfile", "Log file to read");
    parser.addPositionalArgument("output", "File to generate with size information");

    QCommandLineOption randomizedGroups({"r", "random-groups"}, "Number of random group evaluations used. Random evaluation is only used when this option is set", "randomIterations");
    QCommandLineOption dontShowProgress("no-progress", "Do not show the computation progress.");
    QCommandLineOption dontSaveIntermediateResults("no-temp-saves", "Do not save intermediate results.");

    parser.addOption(randomizedGroups);
    parser.addOption(dontShowProgress);
    parser.addOption(dontSaveIntermediateResults);

    // parse command line
    parser.process(app);

    const QStringList arguments = parser.positionalArguments();
    if (arguments.size() != 2) {
        parser.showHelp(1);
    }

    LogFileReader logfile;
    QString logfileName = arguments[0];
    QByteArray lognameBytes = logfileName.toUtf8();
    if (!logfile.open(logfileName)){
        qFatal("Error reading logfile %s: %s", lognameBytes.constData(), logfile.errorMsg().toUtf8().constData());
    }

    if (parser.isSet(randomizedGroups)) {
        int iterations = parser.value(randomizedGroups).toInt();
        ablateRandomized(arguments[1], logfile, iterations, !parser.isSet(dontShowProgress), !parser.isSet(dontSaveIntermediateResults));
    } else {
        ablate(arguments[1], logfile, !parser.isSet(dontShowProgress), !parser.isSet(dontSaveIntermediateResults));
    }

    return 0;
}
