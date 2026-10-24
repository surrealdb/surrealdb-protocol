/**
 * The reference adapter served as a driver process.
 *
 *   bun conformance/runner/cli.ts --driver "bun conformance/runner/raw-driver.ts"
 *
 * Runs the same scenarios as the default in-process adapter, but through the
 * driver line protocol, so CI proves the protocol works end to end. It is also
 * the smallest complete example of a driver.
 */

import { serveDriver } from "./process";
import { RawAdapter } from "./raw";

await serveDriver(new RawAdapter());
