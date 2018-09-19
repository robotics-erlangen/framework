/***************************************************************************
 *   Copyright 2015 Michael Eischer, Jan Kallwies, Philipp Nordhus         *
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

#include "kdtree.h"

class KdTree::Node
{
public:
    Node(const Vector &position, bool inObstacle, const Node *previous, unsigned int axis, Node *parent);
    ~Node();
    Node(const Node&) = delete;
    Node& operator=(const Node&) = delete;

public:
    Node** nearestChildPointer(const Vector &position);
    Node* nearestChild(const Vector &position) const;
    Node* farthestChild(const Vector &position) const;

    const Vector& position() const { return m_position; }
    bool inObstacle() const { return m_inObstacle; }
    const Node* previous() const { return m_previous; }

    unsigned int axis() const { return m_axis; }
    Node* parent() const { return m_parent; }
    Node* child(unsigned int index) const { return m_child[index]; }

    unsigned int depth() const;

    void getChildren(QList<const Node*> &nodes);

private:
    const Vector m_position;
    const bool m_inObstacle;
    const Node* const m_previous;

    const unsigned int m_axis;
    Node* const m_parent;
    Node* m_child[2];
};

inline KdTree::Node** KdTree::Node::nearestChildPointer(const Vector &position)
{
    return &m_child[position[m_axis] > m_position[m_axis]];
}

inline KdTree::Node* KdTree::Node::nearestChild(const Vector &position) const
{
    return m_child[position[m_axis] > m_position[m_axis]];
}

inline KdTree::Node* KdTree::Node::farthestChild(const Vector &position) const
{
    return m_child[position[m_axis] <= m_position[m_axis]];
}

inline void KdTree::Node::getChildren(QList<const Node*> &nodes)
{
    for (int i = 0; i < 2; i++) {
        if (m_child[i]) {
            nodes.append(m_child[i]);
            m_child[i]->getChildren(nodes);
        }
    }
}

KdTree::Node::Node(const Vector &position, bool inObstacle, const Node *previous, unsigned int axis, Node *parent) :
    m_position(position),
    m_inObstacle(inObstacle),
    m_previous(previous),
    m_axis(axis),
    m_parent(parent)
{
    m_child[0] = NULL;
    m_child[1] = NULL;
}

KdTree::Node::~Node()
{
    delete m_child[0];
    delete m_child[1];
}

unsigned int KdTree::Node::depth() const
{
    unsigned int d = 0;
    if (m_child[0]) {
        d = m_child[0]->depth();
    }

    if (m_child[1]) {
        d = std::max(d, m_child[1]->depth());
    }

    return d + 1;
}

/*!
 * \class KdTree
 * \ingroup path
 * \brief Implementation of a k-dimensional tree
 */

/*!
 * \brief Creates a KdTree
 * \param position The position of the root node
 * \param inObstacle Flag whether this node is inside an obstacle
 */
KdTree::KdTree(const Vector &position, bool inObstacle) :
    m_nodeCount(1)
{
    m_root = new Node(position, inObstacle, NULL, 0, NULL);
}

/*!
 * \brief Destroy a KdTree instance
 */
KdTree::~KdTree()
{
    delete m_root;
}

/*!
 * \brief Insert a new node
 * \param position Position of the new node
 * \param previous This node will be set as the previous node for the newly created node
 * \param inObstacle Flag whether the new node is inside an obstacle
 * \return The newly created node
 */
KdTree::Node* KdTree::insert(const Vector &position, bool inObstacle, const Node *previous)
{
    Node *parent = NULL;
    Node **next = &m_root;

    unsigned int axis;
    do {
        axis = (*next)->axis();
        parent = (*next);
        next = parent->nearestChildPointer(position);
    } while (*next);

    *next = new Node(position, inObstacle, previous, axis ^ 1, parent);
    m_nodeCount++;
    // rebalance if necessary

    return *next;
}

/*!
 * \brief Searches the nearest node for a given position
 * \param position Position to search for
 * \return The closest node to @b position
 */
const KdTree::Node* KdTree::nearest(const Vector &position) const
{
    float bestDist = INFINITY;
    float bestDistSquared = INFINITY;
    return nearest(position, m_root, bestDist, bestDistSquared, NULL);
}

KdTree::Node* KdTree::nearest(const Vector &position, Node *root, float &bestDist, float &bestDistSquared, Node *bestNode) const
{
    if (!root) {
        return bestNode;
    }

    Node *currentNode = NULL;

    {
        Node *node = root;
        do {
            currentNode = node;
            node = node->nearestChild(position);
        } while (node);
    }

    do {
        const float dist = (currentNode->position() - position).lengthSquared();
        if (dist < bestDistSquared || bestNode == NULL) {
            bestDistSquared = dist;
            bestDist = std::sqrt(dist);
            bestNode = currentNode;
        }

        const unsigned int axis = currentNode->axis();
        if (std::abs(position[axis] - currentNode->position()[axis]) <= bestDist) {
            bestNode = nearest(position, currentNode->farthestChild(position), bestDist, bestDistSquared, bestNode);
        }

        // when traversing a sub-KdTree we need to abort when we reach its root
        if (currentNode == root) {
            break;
        }

        currentNode = currentNode->parent();
    } while (currentNode);

    return bestNode;
}

/*!
 * \brief Return the depth of the tree
 * \return The depth of the tree
 */
unsigned int KdTree::depth() const
{
    return m_root->depth();
}

/*!
 * \brief Return the position of a node
 * \param node The node to lookup
 * \return The position of the node
 */
const Vector& KdTree::position(const Node *node) const
{
    return node->position();
}

/*!
 * \brief Returns the inObstacle flag attached to the given node
 * \param node The node to lookup
 * \return inObstacle flag of the node
 */
bool KdTree::inObstacle(const Node *node) const
{
    return node->inObstacle();
}

/*!
 * \brief Return the previous node of a node
 * \param node Current node
 * \return The previous node
 */
const KdTree::Node* KdTree::previous(const Node *node) const
{
    return node->previous();
}

/*!
 * \brief Creates a list of all child nodes
 * \return A list of all child nodes
 */
const QList<const KdTree::Node *> KdTree::getChildren() const
{
    QList<const KdTree::Node *> nodes;
    m_root->getChildren(nodes);
    return nodes;
}
