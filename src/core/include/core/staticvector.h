/***************************************************************************
 *   Copyright 2022 Andreas Wendler                                        *
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

#ifndef _STATIC_VECTOR_H
#define _STATIC_VECTOR_H

#include <cassert>
#include <array>

template<typename T, std::size_t n>
class StaticVector {
public:
    void push_back(const T &e) {
        assert(counter < n);
        elements[counter] = e;
        counter++;
    }

    const T& operator[](std::size_t index) const {
        assert(index < n);
        return elements[index];
    }

    T& operator[](std::size_t index) {
        assert(index < n);
        return elements[index];
    }

    const T& back() const {
        assert(counter > 0);
        return elements[counter - 1];
    }

    T& back() {
        assert(counter > 0);
        return elements[counter - 1];
    }

    std::size_t capacity() {
        return n;
    }

    std::size_t size() const {
        return counter;
    }

    void resize(std::size_t numElements) {
        assert(numElements <= n);
        counter = numElements;
    }

private:
    std::array<T, n> elements;
    std::size_t counter = 0;
};

#endif /* _STATIC_VECTOR_H */
