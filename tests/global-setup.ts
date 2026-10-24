import { execSync } from "node:child_process";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://whyno:whyno_local_only@127.0.0.1:54329/whyno_test";
  if (!/test/i.test(new URL(url).pathname)) throw new Error("Refusing to run tests against a non-test database");
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
