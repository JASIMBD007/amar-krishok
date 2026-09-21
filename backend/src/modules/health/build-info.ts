/**
 * Which build is actually running.
 *
 * The API has more than once sat several commits behind main with a migration unapplied, and from
 * outside that is invisible: a behaviour fix changes no response, and the `schema` marker below is
 * a hardcoded string nobody remembers to bump. Reporting the commit turns "is the deploy live?"
 * into one curl.
 *
 * Render sets RENDER_GIT_COMMIT on every build. GIT_COMMIT is honoured too so the same check works
 * under another host or in a container build.
 */
export function buildCommit(env: NodeJS.ProcessEnv = process.env): string {
  const commit = env.RENDER_GIT_COMMIT || env.GIT_COMMIT || env.SOURCE_VERSION;
  return commit?.trim() || "unknown";
}

/** Short form, for reading at a glance against `git log --oneline`. */
export function shortCommit(commit: string): string {
  return commit === "unknown" ? commit : commit.slice(0, 7);
}

/**
 * When this process booted, as opposed to the current time the endpoint already reports. A restart
 * that did not pick up new code shows as a fresh startedAt with an unchanged commit.
 */
export const STARTED_AT = new Date().toISOString();
