import { createAttachmentEnvironmentAtoms } from "@marp/client-runtime/state/attachments";

import { connectionAtomRuntime } from "../connection/runtime";

export const attachmentEnvironment = createAttachmentEnvironmentAtoms(connectionAtomRuntime);
