/**
 * Browser-only compatibility surface for Midnight's indexer provider.
 *
 * The upstream bundle imports both a default and a named `WebSocket` from
 * `isomorphic-ws`; its browser entry currently declares only CommonJS default
 * shape, which makes Vite warn even though the runtime uses the native API.
 * This explicit module gives Rollup the two exports it expects without adding
 * a second WebSocket implementation to the citizen bundle.
 */
const BrowserWebSocket = globalThis.WebSocket;

export { BrowserWebSocket as WebSocket };
export default BrowserWebSocket;
