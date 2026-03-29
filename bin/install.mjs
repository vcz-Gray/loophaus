#!/usr/bin/env node
// Backward-compat wrapper — delegates to bin/loophaus.mjs

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const loophausCli = resolve(dirname(__filename), "loophaus.mjs");

await import(loophausCli);
