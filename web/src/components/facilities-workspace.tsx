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
import styles from "./facilities-workspace.module.css";

interface OrganizationRecord {
  id: string;
  name: string;
}

interface FacilityRecord {
  id: string;
  tenantId: string;
  organizationId: string | null;
  name: string;
  facilityType: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  countryCode: string | null;
  latitude: string | null;
  longitude: string | null;
  timezone: string | null;
  status: string;
  externalId: string | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface FacilityForm {
  name: string;
  organizationId: string;
  facilityType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateRegion: string;
  postalCode: string;
  countryCode: string;
  timezone: string;
  status: string;
}

const emptyForm: FacilityForm = {
  name: "",
  organizationId: "",
  facilityType: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateRegion: "",
  postalCode: "",
  countryCode: "US",
  timezone: "America/Chicago",
  status: "active",
};

export default function FacilitiesWorkspace({
  account,
}: {
  account: AccountInfo;
}) {
  const { instance } = useMsal();

  const [facilities, setFacilities] =
    useState<FacilityRecord[]>([]);

  const [organizations, setOrganizations] =
    useState<OrganizationRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [editorOpen, setEditorOpen] =
    useState(false);

  const [editing, setEditing] =
    useState<FacilityRecord | null>(null);

  const [form, setForm] =
    useState<FacilityForm>(emptyForm);

  const getToken = useCallback(async () => {
    const result =
      await instance.acquireTokenSilent({
        account,
        scopes: [apiScope],
      });

    return result.accessToken;
  }, [account, instance]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const accessToken = await getToken();

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      const [facilityResponse, orgResponse] =
        await Promise.all([
          fetch(
            `${apiBaseUrl}/tenants/${bridgewayTenantId}/facilities`,
            {
              cache: "no-store",
              headers,
            },
          ),
          fetch(
            `${apiBaseUrl}/tenants/${bridgewayTenantId}/organizations`,
            {
              cache: "no-store",
              headers,
            },
          ),
        ]);

      if (!facilityResponse.ok) {
        throw new Error(
          `Facilities API returned HTTP ${facilityResponse.status}`,
        );
      }

      if (!orgResponse.ok) {
        throw new Error(
          `Organizations API returned HTTP ${orgResponse.status}`,
        );
      }

      const facilityData =
        (await facilityResponse.json()) as FacilityRecord[];

      const organizationData =
        (await orgResponse.json()) as OrganizationRecord[];

      setFacilities(facilityData);
      setOrganizations(organizationData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load facilities.",
      );
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const organizationName = (
    organizationId: string | null,
  ) => {
    if (!organizationId) {
      return "Unassigned";
    }

    return (
      organizations.find(
        (organization) =>
          organization.id === organizationId,
      )?.name ?? "Organization"
    );
  };

  const startCreate = () => {
    setEditing(null);

    setForm({
      ...emptyForm,
      organizationId:
        organizations.length === 1
          ? organizations[0].id
          : "",
    });

    setError(null);
    setEditorOpen(true);
  };

  const startEdit = (
    facility: FacilityRecord,
  ) => {
    setEditing(facility);

    setForm({
      name: facility.name,
      organizationId:
        facility.organizationId ?? "",
      facilityType:
        facility.facilityType ?? "",
      addressLine1:
        facility.addressLine1 ?? "",
      addressLine2:
        facility.addressLine2 ?? "",
      city: facility.city ?? "",
      stateRegion:
        facility.stateRegion ?? "",
      postalCode:
        facility.postalCode ?? "",
      countryCode:
        facility.countryCode ?? "US",
      timezone:
        facility.timezone ??
        "America/Chicago",
      status: facility.status,
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
    field: keyof FacilityForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveFacility = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Facility name is required.");
      return;
    }

    if (!form.organizationId) {
      setError(
        "Parent organization is required.",
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const accessToken = await getToken();

      const commonBody = {
        name: form.name.trim(),
        organizationId:
          form.organizationId,
        facilityType:
          form.facilityType.trim() ||
          undefined,
        addressLine1:
          form.addressLine1.trim() ||
          undefined,
        addressLine2:
          form.addressLine2.trim() ||
          undefined,
        city:
          form.city.trim() || undefined,
        stateRegion:
          form.stateRegion.trim() ||
          undefined,
        postalCode:
          form.postalCode.trim() ||
          undefined,
        countryCode:
          form.countryCode.trim() ||
          undefined,
        timezone:
          form.timezone.trim() ||
          undefined,
        status: form.status,
      };

      const url = editing
        ? `${apiBaseUrl}/tenants/${bridgewayTenantId}/facilities/${editing.id}`
        : `${apiBaseUrl}/tenants/${bridgewayTenantId}/facilities`;

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
            : Array.isArray(
                  responseBody?.message,
                )
              ? responseBody.message.join(
                  ", ",
                )
              : `HTTP ${response.status}`;

        throw new Error(message);
      }

      setEditorOpen(false);
      setEditing(null);
      setForm(emptyForm);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save facility.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.workspace}>
      <div className={styles.heading}>
        <div>
          <small>127 GROWTH</small>
          <h1>Facilities</h1>
          <p>
            Physical operating locations
            connected to organizations and
            carried forward through development,
            projects, digital twin, and
            measurement.
          </p>
        </div>

        <button
          type="button"
          className={styles.createButton}
          onClick={startCreate}
          disabled={
            organizations.length === 0
          }
        >
          + New facility
        </button>
      </div>

      <div className={styles.summary}>
        <article>
          <small>FACILITIES</small>
          <strong>
            {loading
              ? "—"
              : facilities.length}
          </strong>
          <span>Total tenant facilities</span>
        </article>

        <article>
          <small>ACTIVE</small>
          <strong>
            {loading
              ? "—"
              : facilities.filter(
                  (facility) =>
                    facility.status ===
                    "active",
                ).length}
          </strong>
          <span>Active facilities</span>
        </article>

        <article>
          <small>ORGANIZATIONS</small>
          <strong>
            {loading
              ? "—"
              : organizations.length}
          </strong>
          <span>
            Available parent organizations
          </span>
        </article>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <small>
              FACILITY DIRECTORY
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
            Loading facilities...
          </div>
        ) : organizations.length === 0 ? (
          <div className={styles.empty}>
            <strong>
              Organization required
            </strong>
            <p>
              Create an organization before
              adding facilities.
            </p>
          </div>
        ) : facilities.length === 0 ? (
          <div className={styles.empty}>
            <strong>
              No facilities yet
            </strong>
            <p>
              Create the first physical
              facility and connect it to an
              organization.
            </p>

            <button
              type="button"
              onClick={startCreate}
            >
              Create facility
            </button>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Facility</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Version</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {facilities.map(
                  (facility) => (
                    <tr key={facility.id}>
                      <td>
                        <strong>
                          {facility.name}
                        </strong>
                      </td>

                      <td>
                        {organizationName(
                          facility.organizationId,
                        )}
                      </td>

                      <td>
                        {facility.facilityType ||
                          "—"}
                      </td>

                      <td>
                        {[
                          facility.city,
                          facility.stateRegion,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>

                      <td>
                        <span
                          className={
                            facility.status ===
                            "active"
                              ? styles.activeStatus
                              : styles.inactiveStatus
                          }
                        >
                          {facility.status}
                        </span>
                      </td>

                      <td>
                        v{facility.version}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={
                            styles.editButton
                          }
                          onClick={() =>
                            startEdit(facility)
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
                    ? "EDIT FACILITY"
                    : "NEW FACILITY"}
                </small>

                <h2>
                  {editing
                    ? editing.name
                    : "Create facility"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditor}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveFacility}>
              <label>
                <span>Facility name *</span>
                <input
                  autoFocus
                  required
                  value={form.name}
                  onChange={(event) =>
                    updateForm(
                      "name",
                      event.target.value,
                    )
                  }
                  placeholder="Houston Operations Center"
                />
              </label>

              <label>
                <span>
                  Parent organization *
                </span>

                <select
                  required
                  value={
                    form.organizationId
                  }
                  onChange={(event) =>
                    updateForm(
                      "organizationId",
                      event.target.value,
                    )
                  }
                >
                  <option value="">
                    Select organization
                  </option>

                  {organizations.map(
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

              <label>
                <span>Facility type</span>
                <input
                  value={
                    form.facilityType
                  }
                  onChange={(event) =>
                    updateForm(
                      "facilityType",
                      event.target.value,
                    )
                  }
                  placeholder="Office, plant, data center, site..."
                />
              </label>

              <label>
                <span>Address</span>
                <input
                  value={
                    form.addressLine1
                  }
                  onChange={(event) =>
                    updateForm(
                      "addressLine1",
                      event.target.value,
                    )
                  }
                  placeholder="Street address"
                />
              </label>

              <label>
                <span>Address line 2</span>
                <input
                  value={
                    form.addressLine2
                  }
                  onChange={(event) =>
                    updateForm(
                      "addressLine2",
                      event.target.value,
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
                  <span>City</span>
                  <input
                    value={form.city}
                    onChange={(event) =>
                      updateForm(
                        "city",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>State / Region</span>
                  <input
                    value={
                      form.stateRegion
                    }
                    onChange={(event) =>
                      updateForm(
                        "stateRegion",
                        event.target.value,
                      )
                    }
                  />
                </label>
              </div>

              <div
                className={
                  styles.formColumns
                }
              >
                <label>
                  <span>Postal code</span>
                  <input
                    value={
                      form.postalCode
                    }
                    onChange={(event) =>
                      updateForm(
                        "postalCode",
                        event.target.value,
                      )
                    }
                  />
                </label>

                <label>
                  <span>Country</span>
                  <input
                    maxLength={2}
                    value={
                      form.countryCode
                    }
                    onChange={(event) =>
                      updateForm(
                        "countryCode",
                        event.target.value,
                      )
                    }
                    placeholder="US"
                  />
                </label>
              </div>

              <div
                className={
                  styles.formColumns
                }
              >
                <label>
                  <span>Timezone</span>
                  <input
                    value={form.timezone}
                    onChange={(event) =>
                      updateForm(
                        "timezone",
                        event.target.value,
                      )
                    }
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
                      : "Create facility"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
