declare namespace Express {
    interface Request {
        userId?: string;
    }
}

/**
 * Use the pure-WASM face-api Node build so no native @tensorflow/tfjs-node
 * binding is required (native builds fail on some Windows/Node setups).
 * Requires @tensorflow/tfjs + @tensorflow/tfjs-backend-wasm (pure JS/WASM);
 * the wasm backend resolves its binaries automatically in Node.
 * Types mirror the main package entry.
 */
declare module "@vladmandic/face-api/dist/face-api.node-wasm.js" {
    import faceapi = require("@vladmandic/face-api");
    export = faceapi;
}