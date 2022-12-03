declare namespace Playback {
    interface FileInformation {
        contents?: string;
        contentsPath?: string;
        codepage: number;
        bom?: string;
    }
    interface FindFileResult {
    }
    interface IoLogFile {
        path: string;
        codepage: number;
        result?: FileInformation;
    }
    export interface IoLog {
        timestamp: string;
        arguments: string[];
        executingPath: string;
        currentDirectory: string;
        useCustomLibraryFile?: boolean;
        filesRead: IoLogFile[];
        filesWritten: {
            path: string;
            contents?: string;
            contentsPath?: string;
            bom: boolean;
        }[];
        filesDeleted: string[];
        filesAppended: {
            path: string;
            contents?: string;
            contentsPath?: string;
        }[];
        fileExists: {
            path: string;
            result?: boolean;
        }[];
        filesFound: {
            path: string;
            pattern: string;
            result?: FindFileResult;
        }[];
        dirs: {
            path: string;
            re: string;
            re_m: boolean;
            re_g: boolean;
            re_i: boolean;
            opts: {
                recursive?: boolean;
            };
            result?: string[];
        }[];
        dirExists: {
            path: string;
            result?: boolean;
        }[];
        dirsCreated: string[];
        pathsResolved: {
            path: string;
            result?: string;
        }[];
        directoriesRead: {
            path: string;
            extensions: readonly string[] | undefined;
            exclude: readonly string[] | undefined;
            include: readonly string[] | undefined;
            depth: number | undefined;
            result: readonly string[];
        }[];
        useCaseSensitiveFileNames?: boolean;
    }
    interface PlaybackControl {
        startReplayFromFile(logFileName: string): void;
        startReplayFromString(logContents: string): void;
        startReplayFromData(log: IoLog): void;
        endReplay(): void;
        startRecord(logFileName: string): void;
        endRecord(): void;
    }
    export interface PlaybackIO extends Harness.IO, PlaybackControl {
    }
    export interface PlaybackSystem extends ts.System, PlaybackControl {
    }
    export function newStyleLogIntoOldStyleLog(log: IoLog, host: ts.System | Harness.IO, baseName: string): IoLog;
    export function oldStyleLogIntoNewStyleLog(log: IoLog, writeFile: typeof Harness.IO.writeFile, baseTestName: string): IoLog;
    export function initWrapper(...[wrapper, underlying]: [PlaybackSystem, ts.System] | [PlaybackIO, Harness.IO]): void;
    export function wrapIO(underlying: Harness.IO): PlaybackIO;
    export function wrapSystem(underlying: ts.System): PlaybackSystem;
    export {};
}
declare namespace ts.server { }
declare namespace Harness { }
//# sourceMappingURL=loggedIO.d.ts.map