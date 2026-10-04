import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://8bd91cc4ab176a3ce5e102ac2452e913@o4512158280056832.ingest.de.sentry.io/4512158312955984",
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_COMMIT_SHA,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.2,
  replaysSessionSampleRate: 0.02,
  replaysOnErrorSampleRate: 1,
});