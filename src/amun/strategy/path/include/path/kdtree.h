/***************************************************************************
 *   Copyright 2015 Michael Eischer, Philipp Nordhus                       *
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

#ifndef KDTREE_H
#define KDTREE_H

#include "core/vector.h"
#include <QList>

class KdTree
{
public:
    class Node;

public:
    KdTree(const Vector &position, bool inObstacle);
    ~KdTree();
    KdTree(const KdTree&) = delete;
    KdTree& operator=(const KdTree&) = delete;

public:
    KdTree::Node* insert(const Vector &position, bool inObstacle, const Node *previous);
    const Node* nearest(const Vector &position) const;
    unsigned int depth() const;

    //! Returns the number of nodes in the tree
    unsigned int nodeCount() const { return m_nodeCount; }

    //! Returns the root node
    const Node* root() const { return m_root; }

    const Vector& position(const Node *node) const;
    bool inObstacle(const Node *node) const;
    const Node* previous(const Node *node) const;
    const QList<const Node*> getChildren() const;

private:
    Node* nearest(const Vector &position, Node *root, float &bestDist, float &bestDistSquared, Node *bestNode) const;

private:
    Node* m_root;
    unsigned int m_nodeCount;
};

#endif // KDTREE_H
