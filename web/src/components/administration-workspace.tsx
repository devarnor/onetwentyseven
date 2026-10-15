"use client";

import type { AccountInfo } from "@azure/msal-browser";
import styles from "./administration-workspace.module.css";

export default function AdministrationWorkspace({
  account,
}: {
  account: AccountInfo;
}) {
  return (
    <section className={styles.workspace}>
      <div className={styles.heading}>
        <div>
          <small>127 ADMINISTRATION</small>
          <h1>Administration</h1>
          <p>
            Manage OneTwentySeven users, roles,
            tenant access, and platform security.
          </p>
        </div>
      </div>

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <small>ACCESS MANAGEMENT</small>
            <h2>Users</h2>
          </div>

          <span className={styles.ready}>
            <i />
            Administration API online
          </span>
        </div>

        <div className={styles.placeholder}>
          <strong>User administration</strong>
          <p>
            The Administration API is ready.
            User provisioning, roles, status,
            and organization assignment will be
            connected in the next checkpoint.
          </p>

          <span>
            Signed in as {account.username}
          </span>
        </div>
      </div>
    </section>
  );
}
