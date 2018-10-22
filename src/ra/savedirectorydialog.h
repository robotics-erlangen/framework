#ifndef SAVEDIRECTORYDIALOG_H
#define SAVEDIRECTORYDIALOG_H

#include <QDialog>
#include <QList>
#include <QString>

namespace Ui {
    class SaveDirectoryDialog;
}

class SaveDirectoryDialog : public QDialog
{
    Q_OBJECT

public:
    explicit SaveDirectoryDialog(const QList<QString> &directories, QWidget *parent = nullptr);
    ~SaveDirectoryDialog();
    // call this function after the dialog finished with status 'Accepted' to get the resulting list
    QList<QString> getResult();

private slots:
    void addDirectory();
    void removeDirectory();

private:
    Ui::SaveDirectoryDialog *ui;
};

#endif // SAVEDIRECTORYDIALOG_H
