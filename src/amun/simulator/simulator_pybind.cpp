
// pybind has to be included first in EVERY HEADER FILE
// in the library in order for Qt macros to not redefinej
// pybind macros and break the build
// https://github.com/pybind/pybind11/issues/2305
#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include <pybind11_protobuf/native_proto_caster.h>
#include "pybind11_protobuf/wrapped_proto_caster.h"
//#include "pybind11_protobuf/na
#include "simulator/simulator.h"


namespace py=pybind11;
PYBIND11_MODULE(pysimulator, m) {
    pybind11_protobuf::ImportNativeProtoCasters();
//    pybind11_protobuf::ImportWrappedProtoCasters();

    py::class_<camun::simulator::Simulator>(m, "Simulator")
            .def(py::init<std::string>())
            .def("get_ssl_wrapper_packet_bytes", &camun::simulator::Simulator::getSSLWraperPacketBytes)
            .def("step_simulation", &camun::simulator::Simulator::stepSimulation)
            .def("get_ssl_wrapper_packets", &camun::simulator::Simulator::getSSLWrapperPackets)
            ;
}
