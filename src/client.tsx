import "./instrument.client";

import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start";
import { getRouter } from "./router";

const router = getRouter();

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <StartClient router={router} />
    </StrictMode>,
  );
});