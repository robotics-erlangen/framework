"use strict";
var ts;
(function (ts) {
    var server;
    (function (server) {
        server.dynamicImport = (id) => import(id);
    })(server = ts.server || (ts.server = {}));
})(ts || (ts = {}));
//# sourceMappingURL=dynamicImportCompat.js.map