"use client";

import { ReactNode, useEffect, useState } from "react";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "@/auth/msal";

const msalInstance =
  new PublicClientApplication(msalConfig);

export default function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    msalInstance
      .initialize()
      .then(() => {
        if (mounted) {
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setFailed(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (failed) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#071019",
          color: "#eef3f6",
          fontFamily: "Arial, sans-serif",
        }}
      >
        Unable to initialize Microsoft authentication.
      </main>
    );
  }

  if (!ready) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#071019",
          color: "#c6a15e",
          fontFamily: "Arial, sans-serif",
          letterSpacing: "0.15em",
        }}
      >
        127
      </main>
    );
  }

  return (
    <MsalProvider instance={msalInstance}>
      {children}
    </MsalProvider>
  );
}
