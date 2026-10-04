import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://8bd91cc4ab176a3ce5e102ac2452e913@o4512158280056832.ingest.de.sentry.io/4512158312955984",
  environment: process.env['VERCEL_ENV'] ?? process.env['NODE_ENV'] ?? "development",
  release: process.env['VERCEL_GIT_COMMIT_SHA'] ?? process.env['COMMIT_SHA'],
  tracesSampleRate: 0.2,
});