"use client";

import {
  InteractionStatus,
  type AccountInfo,
} from "@azure/msal-browser";
import {
  useIsAuthenticated,
  useMsal,
} from "@azure/msal-react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  apiBaseUrl,
  apiScope,
  bridgewayTenantId,
} from "@/auth/msal";
import OrganizationsWorkspace from "@/components/organizations-workspace";
import styles from "./page.module.css";

interface AccountRecord {
  id: string;
  name: string;
}

function Brand() {
  return (
    <div className={styles.brand}>
      <strong>127</strong>
      <div>
        <span>OneTwentySeven</span>
        <small>BRIDGEWAY SOLUTIONS</small>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <span className={styles.msLogo}>
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function LoginPortal() {
  const { instance, inProgress } = useMsal();
  const [error, setError] =
    useState<string | null>(null);

  const signIn = async () => {
    setError(null);

    try {
      await instance.loginRedirect({
        scopes: [
          apiScope,
          "openid",
          "profile",
        ],
        redirectUri: window.location.origin,
      });
    } catch {
      setError(
        "Microsoft sign-in could not be started.",
      );
    }
  };

  return (
    <main className={styles.loginPage}>
      <header>
        <Brand />
        <div className={styles.secure}>
          <i />
          Secure enterprise access
        </div>
      </header>

      <section className={styles.heroGrid}>
        <div className={styles.hero}>
          <small>
            INTELLIGENT LIFECYCLE PLATFORM
          </small>

          <h1>
            One record.
            <br />
            <span>Every stage.</span>
          </h1>

          <p>
            127 connects commercial, development,
            capital, engineering, construction,
            digital twin, measurement, and
            operations into one continuous
            lifecycle.
          </p>

          <div className={styles.flow}>
            Growth <b>→</b> Develop <b>→</b>
            Capital <b>→</b> Projects <b>→</b>
            Twin <b>→</b> Measure
          </div>
        </div>

        <div className={styles.loginCard}>
          <div className={styles.goldLine} />

          <small>127 COMMAND ACCESS</small>

          <h2>Welcome to 127</h2>

          <p>
            Sign in with your authorized
            Microsoft account to access the
            OneTwentySeven platform.
          </p>

          <button
            onClick={signIn}
            disabled={
              inProgress !==
              InteractionStatus.None
            }
          >
            <MicrosoftLogo />
            {inProgress !==
            InteractionStatus.None
              ? "Connecting..."
              : "Sign in with Microsoft"}
          </button>

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <div className={styles.cardInfo}>
            <div>
              <strong>Microsoft Entra ID</strong>
              <span>
                Enterprise authentication
              </span>
            </div>
            <div>
              <strong>Tenant protected</strong>
              <span>Bridgeway Solutions</span>
            </div>
          </div>

          <footer>
            Authorized users only
          </footer>
        </div>
      </section>

      <div className={styles.loginFooter}>
        <span>127 / OneTwentySeven</span>
        <span>
          Secure lifecycle intelligence
        </span>
      </div>
    </main>
  );
}

function CommandPortal({
  account,
}: {
  account: AccountInfo;
}) {
  const { instance } = useMsal();

  const [activeWorkspace, setActiveWorkspace] =
    useState<"command" | "organizations">("command");

  const [accountCount, setAccountCount] =
    useState<number | null>(null);

  const [apiState, setApiState] =
    useState("Connecting");

  const loadAccounts = useCallback(async () => {
    try {
      setApiState("Connecting");

      const token =
        await instance.acquireTokenSilent({
          account,
          scopes: [apiScope],
        });

      const response = await fetch(
        `${apiBaseUrl}/tenants/${bridgewayTenantId}/accounts`,
        {
          headers: {
            Authorization:
              `Bearer ${token.accessToken}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`,
        );
      }

      const records =
        (await response.json()) as AccountRecord[];

      setAccountCount(records.length);
      setApiState("Online");
    } catch {
      setApiState("Attention");
    }
  }, [account, instance]);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const displayName =
    account.name ||
    account.username ||
    "127 User";

  return (
    <main className={styles.commandPage}>
      <header className={styles.commandHeader}>
        <Brand />

        <nav>
          <button
            type="button"
            className={
              activeWorkspace === "command"
                ? styles.activeNav
                : undefined
            }
            onClick={() =>
              setActiveWorkspace("command")
            }
          >
            Command
          </button>

          <button
            type="button"
            className={
              activeWorkspace === "organizations"
                ? styles.activeNav
                : undefined
            }
            onClick={() =>
              setActiveWorkspace("organizations")
            }
          >
            Growth
          </button>

          <span>Develop</span>
          <span>Capital</span>
          <span>Projects</span>
          <span>Twin</span>
          <span>Measure</span>
        </nav>

        <button
          className={styles.user}
          onClick={() =>
            instance.logoutRedirect({
              postLogoutRedirectUri:
                window.location.origin,
            })
          }
        >
          <b>
            {displayName
              .charAt(0)
              .toUpperCase()}
          </b>
          <span>
            {displayName}
            <small>{account.username}</small>
          </span>
        </button>
      </header>

      <div className={styles.commandLayout}>
        <aside>
          <small>PLATFORM</small>
          <strong>⌘ &nbsp; Command</strong>
          <span>✦ &nbsp; Ask 127</span>

          <small>FOUNDATION</small>
          <span>↗ &nbsp; Connect</span>
          <span>◇ &nbsp; Vault</span>
          <span>≡ &nbsp; Ledger</span>

          <div />
          <span>⚙ &nbsp; Administration</span>
        </aside>

        {activeWorkspace === "organizations" ? (
          <OrganizationsWorkspace account={account} />
        ) : (
        <section className={styles.workspace}>
          <div className={styles.welcome}>
            <div>
              <small>127 COMMAND</small>
              <h1>
                Welcome,{" "}
                <span>
                  {
                    displayName.split(
                      " ",
                    )[0]
                  }
                </span>
              </h1>
              <p>
                OneTwentySeven is connected
                and ready for Bridgeway
                Solutions.
              </p>
            </div>

            <div className={styles.production}>
              <i />
              Production
            </div>
          </div>

          <div className={styles.cards}>
            <article>
              <small>IDENTITY</small>
              <strong>Verified</strong>
              <span>Microsoft Entra ID</span>
            </article>

            <article>
              <small>TENANT</small>
              <strong>
                Bridgeway Solutions
              </strong>
              <span>Active membership</span>
            </article>

            <article>
              <small>ACCOUNTS</small>
              <strong>
                {accountCount ?? "—"}
              </strong>
              <span>Growth records</span>
            </article>

            <article>
              <small>127 API</small>
              <strong>{apiState}</strong>
              <span>
                Authenticated service
              </span>
            </article>
          </div>

          <section
            className={styles.lifecycle}
          >
            <small>THE 127 LIFECYCLE</small>

            <h2>
              One continuous record across
              the infrastructure lifecycle
            </h2>

            <div>
              <article>
                <b>01</b>
                <strong>Growth</strong>
                <span>
                  Accounts & opportunities
                </span>
              </article>

              <article>
                <b>02</b>
                <strong>Develop</strong>
                <span>
                  ESIT & development
                </span>
              </article>

              <article>
                <b>03</b>
                <strong>Capital</strong>
                <span>
                  Finance & underwriting
                </span>
              </article>

              <article>
                <b>04</b>
                <strong>Projects</strong>
                <span>
                  Engineering & delivery
                </span>
              </article>

              <article>
                <b>05</b>
                <strong>Twin</strong>
                <span>
                  Digital asset record
                </span>
              </article>

              <article>
                <b>06</b>
                <strong>Measure</strong>
                <span>
                  Performance & evidence
                </span>
              </article>
            </div>
          </section>

          <div className={styles.bottomCards}>
            <article>
              <small>ASK 127</small>
              <h3>
                Intelligence across the
                entire lifecycle
              </h3>
              <p>
                Commercial, engineering,
                financial and operational
                context with preserved
                lineage.
              </p>
            </article>

            <article>
              <small>
                PLATFORM FOUNDATION
              </small>
              <h3>Phase 1</h3>
              <p>
                Identity & tenancy — Active
              </p>
              <p>
                Accounts API — Active
              </p>
              <p>
                Organizations — Building
              </p>
            </article>
          </div>
        </section>
        )}
      </div>
    </main>
  );
}

export default function Home() {
  const { accounts, inProgress } =
    useMsal();

  const isAuthenticated =
    useIsAuthenticated();

  if (
    inProgress !==
      InteractionStatus.None &&
    !isAuthenticated
  ) {
    return (
      <main className={styles.loading}>
        <strong>127</strong>
        <span>
          Securing your session...
        </span>
      </main>
    );
  }

  if (
    !isAuthenticated ||
    !accounts[0]
  ) {
    return <LoginPortal />;
  }

  return (
    <CommandPortal
      account={accounts[0]}
    />
  );
}
