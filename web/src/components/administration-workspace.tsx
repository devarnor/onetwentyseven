"use client";

import type { AccountInfo } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiBaseUrl,
  apiScope,
  bridgewayTenantId,
} from "@/auth/msal";
import styles from "./administration-workspace.module.css";

interface RoleRecord {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isSystem: boolean;
}

interface OrganizationRecord {
  id: string;
  name: string;
  status: string;
}

interface AdministrationUser {
  membershipId: string;
  userId: string;
  entraObjectId: string | null;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  userStatus: string;
  membershipStatus: string;
  primaryOrganizationId: string | null;
  primaryOrganizationName: string | null;
  jobTitle: string | null;
  roles: RoleRecord[];
  version: number;
  createdAt: string;
  updatedAt: string;
}

interface UserForm {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  primaryOrganizationId: string;
  membershipStatus: "active" | "inactive";
  roleCodes: string[];
}

const emptyForm: UserForm = {
  email: "",
  displayName: "",
  firstName: "",
  lastName: "",
  jobTitle: "",
  primaryOrganizationId: "",
  membershipStatus: "active",
  roleCodes: ["user"],
};

export default function AdministrationWorkspace({
  account,
}: {
  account: AccountInfo;
}) {
  const { instance } = useMsal();

  const [users, setUsers] = useState<
    AdministrationUser[]
  >([]);

  const [roles, setRoles] = useState<
    RoleRecord[]
  >([]);

  const [organizations, setOrganizations] =
    useState<OrganizationRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<AdministrationUser | null>(
      null,
    );

  const [form, setForm] =
    useState<UserForm>(emptyForm);

  const getToken = useCallback(async () => {
    const result =
      await instance.acquireTokenSilent({
        account,
        scopes: [apiScope],
      });

    return result.accessToken;
  }, [account, instance]);

  const readError = async (
    response: Response,
  ) => {
    const body = await response
      .json()
      .catch(() => null);

    if (
      body &&
      typeof body.message === "string"
    ) {
      return body.message;
    }

    return `HTTP ${response.status}`;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken =
        await getToken();

      const headers = {
        Authorization:
          `Bearer ${accessToken}`,
      };

      const [
        usersResponse,
        rolesResponse,
        organizationsResponse,
      ] = await Promise.all([
        fetch(
          `${apiBaseUrl}/tenants/${bridgewayTenantId}/administration/users`,
          {
            method: "GET",
            cache: "no-store",
            headers,
          },
        ),
        fetch(
          `${apiBaseUrl}/tenants/${bridgewayTenantId}/administration/roles`,
          {
            method: "GET",
            cache: "no-store",
            headers,
          },
        ),
        fetch(
          `${apiBaseUrl}/tenants/${bridgewayTenantId}/organizations`,
          {
            method: "GET",
            cache: "no-store",
            headers,
          },
        ),
      ]);

      if (!usersResponse.ok) {
        throw new Error(
          await readError(usersResponse),
        );
      }

      if (!rolesResponse.ok) {
        throw new Error(
          await readError(rolesResponse),
        );
      }

      if (!organizationsResponse.ok) {
        throw new Error(
          await readError(
            organizationsResponse,
          ),
        );
      }

      const userData =
        (await usersResponse.json()) as
          AdministrationUser[];

      const roleData =
        (await rolesResponse.json()) as
          RoleRecord[];

      const organizationData =
        (await organizationsResponse.json()) as
          OrganizationRecord[];

      setUsers(userData);
      setRoles(roleData);
      setOrganizations(
        organizationData.filter(
          (organization) =>
            organization.status === "active",
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load Administration data.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.membershipStatus === "active",
      ).length,
    [users],
  );

  const administrators = useMemo(
    () =>
      users.filter(
        (user) =>
          user.membershipStatus ===
            "active" &&
          user.roles.some(
            (role) =>
              role.code ===
              "administrator",
          ),
      ).length,
    [users],
  );

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setEditorOpen(true);
  };

  const startEdit = (
    user: AdministrationUser,
  ) => {
    setEditing(user);

    setForm({
      email: user.email,
      displayName:
        user.displayName ?? "",
      firstName:
        user.firstName ?? "",
      lastName:
        user.lastName ?? "",
      jobTitle:
        user.jobTitle ?? "",
      primaryOrganizationId:
        user.primaryOrganizationId ?? "",
      membershipStatus:
        user.membershipStatus ===
        "inactive"
          ? "inactive"
          : "active",
      roleCodes:
        user.roles.map(
          (role) => role.code,
        ),
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

  const updateForm = <
    K extends keyof UserForm,
  >(
    field: K,
    value: UserForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleRole = (
    roleCode: string,
  ) => {
    setForm((current) => {
      const selected =
        current.roleCodes.includes(
          roleCode,
        );

      return {
        ...current,
        roleCodes: selected
          ? current.roleCodes.filter(
              (code) =>
                code !== roleCode,
            )
          : [
              ...current.roleCodes,
              roleCode,
            ],
      };
    });
  };

  const saveUser = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (
      !editing &&
      !form.email.trim()
    ) {
      setError(
        "Email address is required.",
      );
      return;
    }

    if (
      form.roleCodes.length === 0
    ) {
      setError(
        "At least one role is required.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const accessToken =
        await getToken();

      const url = editing
        ? `${apiBaseUrl}/tenants/${bridgewayTenantId}/administration/users/${editing.membershipId}`
        : `${apiBaseUrl}/tenants/${bridgewayTenantId}/administration/users`;

      const body = editing
        ? {
            expectedVersion:
              editing.version,
            jobTitle:
              form.jobTitle.trim() ||
              undefined,
            primaryOrganizationId:
              form.primaryOrganizationId ||
              undefined,
            membershipStatus:
              form.membershipStatus,
            roleCodes:
              form.roleCodes,
          }
        : {
            email:
              form.email
                .trim()
                .toLowerCase(),
            displayName:
              form.displayName.trim() ||
              undefined,
            firstName:
              form.firstName.trim() ||
              undefined,
            lastName:
              form.lastName.trim() ||
              undefined,
            jobTitle:
              form.jobTitle.trim() ||
              undefined,
            primaryOrganizationId:
              form.primaryOrganizationId ||
              undefined,
            roleCodes:
              form.roleCodes,
          };

      const response = await fetch(
        url,
        {
          method: editing
            ? "PATCH"
            : "POST",
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readError(response),
        );
      }

      setEditorOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save user.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.workspace}>
      <div className={styles.heading}>
        <div>
          <small>
            127 ADMINISTRATION
          </small>
          <h1>Users</h1>
          <p>
            Manage tenant access,
            organizational assignment,
            roles, and account status for
            OneTwentySeven.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.createButton
          }
          onClick={startCreate}
        >
          + Add user
        </button>
      </div>

      <div className={styles.summary}>
        <article>
          <small>USERS</small>
          <strong>
            {loading
              ? "—"
              : users.length}
          </strong>
          <span>
            Tenant memberships
          </span>
        </article>

        <article>
          <small>ACTIVE</small>
          <strong>
            {loading
              ? "—"
              : activeUsers}
          </strong>
          <span>
            Active platform users
          </span>
        </article>

        <article>
          <small>
            ADMINISTRATORS
          </small>
          <strong>
            {loading
              ? "—"
              : administrators}
          </strong>
          <span>
            Active administrators
          </span>
        </article>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>

          {!editorOpen && (
            <button
              type="button"
              onClick={() =>
                void loadData()
              }
            >
              Retry
            </button>
          )}
        </div>
      )}

      <div className={styles.panel}>
        <div
          className={
            styles.panelHeader
          }
        >
          <div>
            <small>
              USER DIRECTORY
            </small>
            <h2>
              Bridgeway Solutions
            </h2>
          </div>

          <span
            className={styles.live}
          >
            <i />
            Live data
          </span>
        </div>

        {loading ? (
          <div
            className={styles.empty}
          >
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div
            className={styles.empty}
          >
            <strong>
              No users yet
            </strong>
            <p>
              Add the first
              OneTwentySeven user for
              this tenant.
            </p>

            <button
              type="button"
              onClick={startCreate}
            >
              Add user
            </button>
          </div>
        ) : (
          <div
            className={
              styles.tableWrap
            }
          >
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>
                    Organization
                  </th>
                  <th>
                    Job title
                  </th>
                  <th>Status</th>
                  <th>Identity</th>
                  <th>Version</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr
                    key={
                      user.membershipId
                    }
                  >
                    <td>
                      <strong>
                        {user.displayName ||
                          user.email}
                      </strong>
                      <span
                        className={
                          styles.secondary
                        }
                      >
                        {user.email}
                      </span>
                    </td>

                    <td>
                      <div
                        className={
                          styles.roles
                        }
                      >
                        {user.roles.map(
                          (role) => (
                            <span
                              key={
                                role.id
                              }
                            >
                              {
                                role.name
                              }
                            </span>
                          ),
                        )}
                      </div>
                    </td>

                    <td>
                      {user.primaryOrganizationName ||
                        "—"}
                    </td>

                    <td>
                      {user.jobTitle ||
                        "—"}
                    </td>

                    <td>
                      <span
                        className={
                          user.membershipStatus ===
                          "active"
                            ? styles.activeStatus
                            : styles.inactiveStatus
                        }
                      >
                        {
                          user.membershipStatus
                        }
                      </span>
                    </td>

                    <td>
                      <span
                        className={
                          user.entraObjectId
                            ? styles.identityLinked
                            : styles.identityPending
                        }
                      >
                        {user.entraObjectId
                          ? "Linked"
                          : "Pending"}
                      </span>
                    </td>

                    <td>
                      v{user.version}
                    </td>

                    <td>
                      <button
                        type="button"
                        className={
                          styles.editButton
                        }
                        onClick={() =>
                          startEdit(
                            user,
                          )
                        }
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editorOpen && (
        <div
          className={styles.overlay}
          role="presentation"
        >
          <aside
            className={styles.editor}
          >
            <div
              className={
                styles.editorHeading
              }
            >
              <div>
                <small>
                  {editing
                    ? "EDIT USER"
                    : "NEW USER"}
                </small>

                <h2>
                  {editing
                    ? editing.displayName ||
                      editing.email
                    : "Add user"}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close"
                onClick={
                  closeEditor
                }
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                saveUser
              }
            >
              <label>
                <span>
                  Email address
                </span>
                <input
                  type="email"
                  value={
                    form.email
                  }
                  disabled={
                    Boolean(editing)
                  }
                  required={
                    !editing
                  }
                  onChange={(event) =>
                    updateForm(
                      "email",
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              {!editing && (
                <>
                  <label>
                    <span>
                      Display name
                    </span>
                    <input
                      value={
                        form.displayName
                      }
                      onChange={(
                        event,
                      ) =>
                        updateForm(
                          "displayName",
                          event.target
                            .value,
                        )
                      }
                    />
                  </label>

                  <div
                    className={
                      styles.formColumns
                    }
                  >
                    <label>
                      <span>
                        First name
                      </span>
                      <input
                        value={
                          form.firstName
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "firstName",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>

                    <label>
                      <span>
                        Last name
                      </span>
                      <input
                        value={
                          form.lastName
                        }
                        onChange={(
                          event,
                        ) =>
                          updateForm(
                            "lastName",
                            event
                              .target
                              .value,
                          )
                        }
                      />
                    </label>
                  </div>
                </>
              )}

              <label>
                <span>
                  Job title
                </span>
                <input
                  value={
                    form.jobTitle
                  }
                  onChange={(event) =>
                    updateForm(
                      "jobTitle",
                      event.target
                        .value,
                    )
                  }
                />
              </label>

              <label>
                <span>
                  Primary organization
                </span>

                <select
                  value={
                    form.primaryOrganizationId
                  }
                  onChange={(event) =>
                    updateForm(
                      "primaryOrganizationId",
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Unassigned
                  </option>

                  {organizations.map(
                    (
                      organization,
                    ) => (
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

              {editing && (
                <label>
                  <span>
                    Membership status
                  </span>

                  <select
                    value={
                      form.membershipStatus
                    }
                    onChange={(event) =>
                      updateForm(
                        "membershipStatus",
                        event.target
                          .value as
                          | "active"
                          | "inactive",
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
              )}

              <fieldset
                className={
                  styles.roleFieldset
                }
              >
                <legend>
                  Roles
                </legend>

                {roles.map(
                  (role) => (
                    <label
                      key={
                        role.id
                      }
                      className={
                        styles.roleOption
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          form.roleCodes.includes(
                            role.code,
                          )
                        }
                        onChange={() =>
                          toggleRole(
                            role.code,
                          )
                        }
                      />

                      <span>
                        <strong>
                          {role.name}
                        </strong>

                        <small>
                          {role.description}
                        </small>
                      </span>
                    </label>
                  ),
                )}
              </fieldset>

              {editing && (
                <p
                  className={
                    styles.versionNote
                  }
                >
                  Current membership
                  version:{" "}
                  {editing.version}
                </p>
              )}

              {!editing && (
                <p
                  className={
                    styles.identityNote
                  }
                >
                  This creates the
                  OneTwentySeven user
                  record and tenant
                  access. Microsoft
                  identity linking will
                  occur during the secure
                  sign-in flow.
                </p>
              )}

              <div
                className={
                  styles.formActions
                }
              >
                <button
                  type="button"
                  disabled={saving}
                  onClick={
                    closeEditor
                  }
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
                      : "Add user"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </section>
  );
}
