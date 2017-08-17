#include "visualizationproxymodel.h"

#include <QStandardItem>
#include <QStandardItemModel>

VisualizationProxyModel::VisualizationProxyModel(QObject *parent)
    : QSortFilterProxyModel(parent)
{ }

bool VisualizationProxyModel::lessThan(const QModelIndex &left, const QModelIndex &right) const
{
    QStandardItemModel * source = (QStandardItemModel*)sourceModel();
    QStandardItem * leftItem = source->itemFromIndex(left);
    QStandardItem * rightItem = source->itemFromIndex(right);

    if ((leftItem->checkState() == Qt::Checked) != (rightItem->checkState() == Qt::Checked)) {
        return leftItem->checkState() == Qt::Checked;
    } else {
        return QString::localeAwareCompare(leftItem->text(), rightItem->text()) < 0;
    }
}
