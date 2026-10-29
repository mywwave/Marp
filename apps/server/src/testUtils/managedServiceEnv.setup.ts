import { SERVICE_LAUNCHER_CONTEXT_ENV } from "../cloud/serviceProtocol.ts";

// Agents inside a managed Marp service inherit its home and launcher context; CI has neither.
for (const name of ["MARP_HOME", "MARP_BOOT_SERVICE_UNIT", SERVICE_LAUNCHER_CONTEXT_ENV]) {
  delete process.env[name];
}
