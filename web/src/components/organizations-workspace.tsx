"use client";

import type { AccountInfo } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  apiBaseUrl,
  apiScope,
  bridgewayTenantId,
} from "@/auth/msal";
import styles from "./organizations-workspace.module.css";

interface OrganizationRecord {
  id: string;
  tenantId: string;
  parentOrganizationId: string | null;
  name: string;
  legalName: string | null;
  organizationType: string | null;
  status: string;
  externalId: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface OrganizationForm {
  name: string;
  legalName: string;
  organizationType: string;
  parentOrganizationId: string;
  status: string;
}

const emptyForm: OrganizationForm = {
  name: "",
  legalName: "",
  organizationType: "",
  parentOrganizationId: "",
  status: "active",
};

export default function OrganizationsWorkspace({
  account,
}: {
  account: AccountInfo;
}) {
  const { instance } = useMsal();

  const [organizations, setOrganizations] = useState<
    OrganizationRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<OrganizationRecord | null>(null);

  const [form, setForm] =
    useState<OrganizationForm>(emptyForm);

  const getToken = useCallback(async () => {
    const result =
      await instance.acquireTokenSilent({
        account,
        scopes: [apiScope],
      });

    return result.accessToken;
  }, [account, instance]);

  const loadOrganizations =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const accessToken = await getToken();

        const response = await fetch(
          `${apiBaseUrl}/tenants/${bridgewayTenantId}/organizations`,
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error(
            `Organizations API returned HTTP ${response.status}`,
          );
        }

        const data =
          (await response.json()) as OrganizationRecord[];

        setOrganizations(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load organizations.",
        );
      } finally {
        setLoading(false);
      }
    }, [getToken]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setEditorOpen(true);
  };

  const startEdit = (
    organization: OrganizationRecord,
  ) => {
    setEditing(organization);

    setForm({
      name: organization.name,
      legalName:
        organization.legalName ?? "",
      organizationType:
        organization.organizationType ?? "",
      parentOrganizationId:
        organization.parentOrganizationId ?? "",
      status: organization.status,
    });

    setError(null);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) {
      return;
    }

    setEditorOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const updateForm = (
    field: keyof OrganizationForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveOrganization = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError(
        "Organization name is required.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const accessToken = await getToken();

      const commonBody = {
        name: form.name.trim(),
        legalName:
          form.legalName.trim() || undefined,
        organizationType:
          form.organizationType.trim() ||
          undefined,
        status: form.status,
        parentOrganizationId:
          form.parentOrganizationId ||
          undefined,
      };

      const url = editing
        ? `${apiBaseUrl}/tenants/${bridgewayTenantId}/organizations/${editing.id}`
        : `${apiBaseUrl}/tenants/${bridgewayTenantId}/organizations`;

      const body = editing
        ? {
            ...commonBody,
            expectedVersion:
              editing.version,
          }
        : commonBody;

      const response = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const responseBody =
          await response
            .json()
            .catch(() => null);

        const message =
          responseBody &&
          typeof responseBody.message ===
            "string"
            ? responseBody.message
            : `HTTP ${response.status}`;

        throw new Error(message);
      }

      setEditorOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadOrganizations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save organization.",
      );
    } finally {
      setSaving(false);
    }
  };

  const parentName = (
    parentOrganizationId: string | null,
  ) => {
    if (!parentOrganizationId) {
      return "Top level";
    }

    return (
      organizations.find(
        (item) =>
          item.id === parentOrganizationId,
      )?.name ?? "Parent organization"
    );
  };

  return (
    <section className={styles.workspace}>
      <div className={styles.heading}>
        <div>
          <small>127 GROWTH</small>
          <h1>Organizations</h1>
          <p>
            Manage the organizational
            structure that connects accounts,
            facilities, users, and lifecycle
            records across OneTwentySeven.
          </p>
        </div>

        <button
          type="button"
          className={styles.createButton}
          onClick={startCreate}
        >
          + New organization
        </button>
      </div>

      <div className={styles.summary}>
        <article>
          <small>ORGANIZATIONS</small>
          <strong>
            {loading
              ? "—"
              : organizations.length}
          </strong>
          <span>
            Bridgeway tenant records
          </span>
        </article>

        <article>
          <small>ACTIVE</small>
          <strong>
            {loading
              ? "—"
              : organizations.filter(
                  (item) =>
                    item.status === "active",
                ).length}
          </strong>
          <span>Active organizations</span>
        </article>

        <article>
          <small>STRUCTURE</small>
          <strong>
            {loading
              ? "—"
              : organizations.filter(
                  (item) =>
                    item.parentOrganizationId,
                ).length}
          </strong>
          <span>Child organizations</span>
        </article>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>

          {!editorOpen && (
            <button
              type="button"
              onClick={() =>
                void loadOrganizations()
              }
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <small>
              ORGANIZATION DIRECTORY
            </small>
            <h2>
              Bridgeway Solutions
            </h2>
          </div>

          <span className={styles.live}>
            <i />
            Live data
          </span>
        </div>

        {loading ? (
          <div className={styles.empty}>
            Loading organizations...
          </div>
        ) : organizations.length === 0 ? (
          <div className={styles.empty}>
            <strong>
              No organizations yet
            </strong>
            <p>
              Create the first organization
              record for the Bridgeway
              Solutions tenant.
            </p>

            <button
              type="button"
              onClick={startCreate}
            >
              Create organization
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Legal name</th>
                  <th>Type</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {organizations.map(
                  (organization) => (
                    <tr
                      key={organization.id}
                    >
                      <td>
                        <strong>
                          {organization.name}
                        </strong>
                      </td>

                      <td>
                        {organization.legalName ||
                          "—"}
                      </td>

                      <td>
                        {organization.organizationType ||
                          "—"}
                      </td>

                      <td>
                        {parentName(
                          organization.parentOrganizationId,
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            organization.status ===
                            "active"
                              ? styles.activeStatus
                              : styles.inactiveStatus
                          }
                        >
                          {organization.status}
                        </span>
                      </td>

                      <td>
                        v{organization.version}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={
                            styles.editButton
                          }
                          onClick={() =>
                            startEdit(
                              organization,
                            )
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editorOpen && (
        <div className={styles.overlay}>
          <div className={styles.editor}>
            <div
              className={
                styles.editorHeading
              }
            >
              <div>
                <small>
                  {editing
                    ? "EDIT ORGANIZATION"
                    : "NEW ORGANIZATION"}
                </small>

                <h2>
                  {editing
                    ? editing.name
                    : "Create organization"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={saveOrganization}
            >
              <label>
                <span>
                  Organization name *
                </span>
                <input
                  autoFocus
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="Bridgeway Solutions"
                  required
                />
              </label>

              <label>
                <span>Legal name</span>
                <input
                  value={form.legalName}
                  onChange={(event) =>
                    updateForm(
                      "legalName",
                      event.target.value,
                    )
                  }
                  placeholder="Legal entity name"
                />
              </label>

              <div
                className={
                  styles.formColumns
                }
              >
                <label>
                  <span>
                    Organization type
                  </span>
                  <input
                    value={
                      form.organizationType
                    }
                    onChange={(event) =>
                      updateForm(
                        "organizationType",
                        event.target.value,
                      )
                    }
                    placeholder="Company, division, subsidiary..."
                  />
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateForm(
                        "status",
                        event.target.value,
                      )
                    }
                  >
                    <option value="active">
                      Active
                    </option>
                    <option value="inactive">
                      Inactive
                    </option>
                  </select>
                </label>
              </div>

              <label>
                <span>
                  Parent organization
                </span>

                <select
                  value={
                    form.parentOrganizationId
                  }
                  onChange={(event) =>
                    updateForm(
                      "parentOrganizationId",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    No parent / top level
                  </option>

                  {organizations
                    .filter(
                      (organization) =>
                        organization.id !==
                        editing?.id,
                    )
                    .map(
                      (organization) => (
                        <option
                          key={
                            organization.id
                          }
                          value={
                            organization.id
                          }
                        >
                          {
                            organization.name
                          }
                        </option>
                      ),
                    )}
                </select>
              </label>

              {editing?.parentOrganizationId &&
                !form.parentOrganizationId && (
                  <p
                    className={
                      styles.parentNote
                    }
                  >
                    The current API preserves
                    an existing parent when the
                    field is blank. Select
                    another organization to
                    change the parent.
                  </p>
                )}

              <div
                className={
                  styles.formActions
                }
              >
                <button
                  type="button"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Save changes"
                      : "Create organization"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
