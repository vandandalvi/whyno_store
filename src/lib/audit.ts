import { db } from "./db";

export async function audit(actorId: string | null, action: string, entity: string, entityId?: string, summary = "") {
  await db.auditEvent.create({ data: { actorId, action, entity, entityId, summary: summary.slice(0, 300) } });
}
