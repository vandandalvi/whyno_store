/**
 * Creates (or resets the password of) an admin account.
 *   ADMIN_EMAIL=you@example.com npm run admin:create
 * The password is read from a hidden prompt (or ADMIN_PASSWORD for automation) and never printed.
 */
import { createInterface } from "node:readline";
import { PrismaClient } from "@prisma/client";
import { hashPassword, validatePasswordStrength } from "../src/lib/auth";

function askHidden(q: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // @ts-expect-error private API used to mask typed characters
    rl._writeToOutput = (s: string) => { if (s.includes(q)) process.stdout.write(s); };
    rl.question(q, (a) => { rl.close(); process.stdout.write("\n"); resolve(a); });
  });
}

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Set ADMIN_EMAIL to a valid email address.");
  const password = process.env.ADMIN_PASSWORD ?? (await askHidden("New password (min 12 chars, letters + numbers): "));
  const problem = validatePasswordStrength(password);
  if (problem) throw new Error(problem);

  const db = new PrismaClient();
  try {
    const passwordHash = await hashPassword(password);
    const user = await db.adminUser.upsert({
      where: { email },
      create: { email, passwordHash, role: "OWNER" },
      update: { passwordHash, active: true },
    });
    await db.adminSession.deleteMany({ where: { userId: user.id } }); // force re-login everywhere
    console.log(`Admin account ready for ${email}.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
