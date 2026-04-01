#!/usr/bin/env node
// Backward-compat wrapper — delegates to bin/loophaus.ts

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const loophausCli: string = resolve(dirname(__filename), "loophaus.js");

await import(loophausCli);
