#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "simulator/simulator.h"

namespace py=pybind11;

PYBIND11_MODULE(pysimulator, m) {
    py::class_<camun::simulator::Simulator>(m, "Simulator")
            .def(py::init<std::string>())
            .def("get_ssl_wrapper_packet_bytes", &camun::simulator::Simulator::getSSLWraperPacketBytes)
            .def("step_simulation", &camun::simulator::Simulator::stepSimulation)
//            .def("get_ssl_wrapper_packets", &camun::simulator::Simulator::getSSLWrapperPackets)
            ;
}
