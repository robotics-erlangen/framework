#ifndef VISUALIZATIONPROXYMODEL_H
#define VISUALIZATIONPROXYMODEL_H

#include <QSortFilterProxyModel>

class VisualizationProxyModel : public QSortFilterProxyModel
{
    Q_OBJECT

public:
    VisualizationProxyModel(QObject *parent = 0);

protected:
    bool lessThan(const QModelIndex &left, const QModelIndex &right) const Q_DECL_OVERRIDE;
};

#endif // VISUALIZATIONPROXYMODEL_H
