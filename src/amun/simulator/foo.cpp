#include <iostream>
#include <pybind11/pybind11.h>

void baz() {
    std::cout << "baz" << std::endl;
}

namespace py = pybind11;
PYBIND11_MODULE(foo, m) {
    m.def("baz", &baz);
}

