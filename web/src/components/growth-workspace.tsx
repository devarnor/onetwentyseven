"use client";

import type { AccountInfo } from "@azure/msal-browser";
import { useState } from "react";
import FacilitiesWorkspace from "./facilities-workspace";
import OrganizationsWorkspace from "./organizations-workspace";
import styles from "./growth-workspace.module.css";

export default function GrowthWorkspace({
  account,
}: {
  account: AccountInfo;
}) {
  const [section, setSection] =
    useState<"organizations" | "facilities">(
      "organizations",
    );

  return (
    <div className={styles.growth}>
      <div className={styles.subnav}>
        <button
          type="button"
          className={
            section === "organizations"
              ? styles.active
              : undefined
          }
          onClick={() =>
            setSection("organizations")
          }
        >
          Organizations
        </button>

        <button
          type="button"
          className={
            section === "facilities"
              ? styles.active
              : undefined
          }
          onClick={() =>
            setSection("facilities")
          }
        >
          Facilities
        </button>
      </div>

      {section === "organizations" ? (
        <OrganizationsWorkspace
          account={account}
        />
      ) : (
        <FacilitiesWorkspace
          account={account}
        />
      )}
    </div>
  );
}
