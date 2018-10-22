#include "savedirectorydialog.h"
#include "ui_savedirectorydialog.h"

#include <QFileDialog>

SaveDirectoryDialog::SaveDirectoryDialog(const QList<QString> &directories, QWidget *parent) :
    QDialog(parent),
    ui(new Ui::SaveDirectoryDialog)
{
    ui->setupUi(this);
    setWindowTitle("Choose logfile directories");
    ui->directoryList->addItems(directories);
    connect(ui->addButton, SIGNAL(clicked()), this, SLOT(addDirectory()));
    connect(ui->removeButton, SIGNAL(clicked()), this, SLOT(removeDirectory()));
}

SaveDirectoryDialog::~SaveDirectoryDialog()
{
    delete ui;
}

void SaveDirectoryDialog::addDirectory()
{
    QString dir = QFileDialog::getExistingDirectory(this, tr("Open Directory"), QString(),
                                                    QFileDialog::ShowDirsOnly | QFileDialog::DontResolveSymlinks);
    if (!dir.isEmpty()) {
        ui->directoryList->addItem(dir);
    }
}

void SaveDirectoryDialog::removeDirectory()
{
    qDeleteAll(ui->directoryList->selectedItems());
}

QList<QString> SaveDirectoryDialog::getResult()
{
    QList<QString> result;
    for (int i = 0; i < ui->directoryList->count(); ++i) {
        result.append(ui->directoryList->item(i)->text());
    }
    return result;
}
