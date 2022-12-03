declare namespace ts {
    enum StatisticType {
        time = 0,
        count = 1,
        memory = 2
    }
    function isBuild(commandLineArgs: readonly string[]): boolean;
    type ExecuteCommandLineCallbacks = (program: Program | BuilderProgram | ParsedCommandLine) => void;
    function executeCommandLine(system: System, cb: ExecuteCommandLineCallbacks, commandLineArgs: readonly string[]): void | WatchOfConfigFile<EmitAndSemanticDiagnosticsBuilderProgram> | SolutionBuilder<EmitAndSemanticDiagnosticsBuilderProgram>;
}
//# sourceMappingURL=executeCommandLine.d.ts.map