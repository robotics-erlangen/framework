#ifndef LOGHELPER_H
#define LOGHELPER_H

class QString;
class QDateTime;

class LogHelper
{
public:
    static QString dateTimeToString(const QDateTime & date);
};

#endif // LOGHELPER_H
