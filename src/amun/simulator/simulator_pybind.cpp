#include <pybind11/pybind11.h>
#include <pybind11/stl.h>
#include "simulator/simulator.h"

namespace py=pybind11;

PYBIND11_MODULE(erforce_simulator, m) {
    py::class_<camun::simulator::Simulator>(m, "Simulator")
            .def(py::init<std::string, std::string>())
            .def("step_simulation", &camun::simulator::Simulator::stepSimulation)
            .def("get_serialized_ssl_wrapper_packets", &camun::simulator::Simulator::getSerializedSSLWrapperPackets)
            .def("get_serialized_true_state_tracked_frame", &camun::simulator::Simulator::getSerializedTrueStateTrackedFrame)
            .def("get_and_clear_serialized_errors", &camun::simulator::Simulator::getAndClearSerializedErrors)
            .def("handle_yellow_robot_control", &camun::simulator::Simulator::handleSerializedYellowRobotControl)
            .def("handle_blue_robot_control", &camun::simulator::Simulator::handleSerializedBlueRobotControl)
            .def("handle_simulator_command", &camun::simulator::Simulator::handleSerializedSimulatorCommand)
            ;
}
