import { equal, match, ok } from "node:assert/strict";
import { test } from "node:test";

import { buildCommit, shortCommit } from "./build-info";
import { HealthController } from "./health.controller";

/**
 * The point of reporting the commit is that a stale deploy is otherwise invisible from outside, so
 * what matters is that it reads the variable the host actually sets and degrades to something
 * obviously unhelpful rather than to a plausible wrong answer.
 */

const SHA = "bb1e5fe0c2a94d3f1a7e5b8c9d0e1f2a3b4c5d6e";

test("reads the commit Render sets on every build", () => {
  equal(buildCommit({ RENDER_GIT_COMMIT: SHA } as NodeJS.ProcessEnv), SHA);
});

test("honours GIT_COMMIT and SOURCE_VERSION so the check survives a change of host", () => {
  equal(buildCommit({ GIT_COMMIT: SHA } as NodeJS.ProcessEnv), SHA);
  equal(buildCommit({ SOURCE_VERSION: SHA } as NodeJS.ProcessEnv), SHA);
});

test("Render's variable wins when more than one is set", () => {
  equal(buildCommit({ GIT_COMMIT: "other", RENDER_GIT_COMMIT: SHA } as NodeJS.ProcessEnv), SHA);
});

test("an absent or blank commit reads as unknown rather than as an empty string", () => {
  // An empty string in the response would look like a real answer on a screen.
  equal(buildCommit({} as NodeJS.ProcessEnv), "unknown");
  equal(buildCommit({ RENDER_GIT_COMMIT: "   " } as NodeJS.ProcessEnv), "unknown");
});

test("the short form lines up with git log --oneline, and unknown stays readable", () => {
  equal(shortCommit(SHA), "bb1e5fe");
  equal(shortCommit("unknown"), "unknown");
});

test("the endpoint still carries what it carried before", () => {
  const body = new HealthController().check();

  equal(body.status, "ok");
  equal(body.name, "amar-krishok-backend");
  equal(body.schema, "lot-status-route-v3");
  match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test("the endpoint reports the build and when it booted", () => {
  const body = new HealthController().check();

  ok("commit" in body && "commitShort" in body);
  match(body.startedAt, /^\d{4}-\d{2}-\d{2}T/);
  // startedAt is fixed at import; timestamp moves. A restart on unchanged code is the difference.
  ok(new Date(body.startedAt).getTime() <= new Date(body.timestamp).getTime());
});
