import { useEffect, useState } from "react";

import { ApiError, request } from "../api";
import type {
  Application,
  Club,
  Member,
  PageProps,
  University,
} from "../types";

type View = "discover" | "club" | "mine" | "apply" | "members" | "admin";

type Snapshot = {
  universities: University[];
  clubs: Club[];
  total: number;
  mine: Club[];
  applications: Application[];
  selected: Club | null;
  members: Member[];
  queue: Application[];
  queueTotal: number;
};

type Modal =
  | { kind: "review"; application: Application }
  | { kind: "leave"; club: Club }
  | { kind: "administrator"; member: Member };

export function useClubWorkspace(view: View, props: PageProps) {
  const { session, clubId, expireSession } = props;
  const userId = session?.user.id;
  const isSiteAdmin = session?.isSiteAdmin || false;

  const params = new URLSearchParams(location.search);
  const search = params.get("q") || "";
  const universityId = params.get("universityId") || "";
  const offset = Number(params.get("offset") || 0);
  const reviewStatus = params.get("status") || "pending";
  const editingId = params.get("application");

  const [revision, setRevision] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    data: Snapshot | null;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<Modal | null>(null);

  const requestKey = JSON.stringify([
    userId,
    isSiteAdmin,
    view,
    clubId,
    search,
    universityId,
    offset,
    reviewStatus,
    revision,
  ]);

  // results belong to one request and account; stale private data is never rendered
  const data = loaded?.key === requestKey ? loaded.data : null;
  const loading = loaded?.key !== requestKey;
  const editing = data?.applications.find(
    (application) =>
      application.id === editingId && application.approvalStatus !== "approved",
  );

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      try {
        const options = { signal: controller.signal };
        const query = new URLSearchParams({
          q: search,
          offset: String(offset),
          ...(universityId ? { universityId } : {}),
        });

        const [universities, listing, workspace, applications, selected] =
          await Promise.all([
            request<{ universities: University[] }>("/universities", options),
            request<{ clubs: Club[]; total: number }>(
              `/clubs?${query}`,
              options,
            ),
            userId
              ? request<{ clubs: Club[] }>("/me/clubs", options)
              : Promise.resolve({ clubs: [] }),
            userId
              ? request<{ applications: Application[] }>(
                  "/club-applications",
                  options,
                )
              : Promise.resolve({ applications: [] }),
            clubId
              ? request<{ club: Club }>(`/clubs/${clubId}`, options)
              : Promise.resolve({ club: null }),
          ]);

        const queue =
          view === "admin" && userId && isSiteAdmin
            ? await request<{ applications: Application[]; total: number }>(
                `/admin/club-applications?status=${reviewStatus}&offset=${offset}`,
                options,
              )
            : { applications: [], total: 0 };

        const canManage = workspace.clubs.some(
          (club) => club.id === clubId && club.canManage,
        );
        const members =
          view === "members" && canManage
            ? await request<{ members: Member[] }>(
                `/clubs/${clubId}/members`,
                options,
              )
            : { members: [] };

        if (!active) {
          return;
        }

        setLoaded({
          key: requestKey,
          data: {
            universities: universities.universities,
            clubs: listing.clubs,
            total: listing.total,
            mine: workspace.clubs,
            applications: applications.applications,
            selected: selected.club,
            members: members.members,
            queue: queue.applications,
            queueTotal: queue.total,
          },
        });
        setError("");
      } catch (cause) {
        if (!active) {
          return;
        }

        if (cause instanceof ApiError && cause.status === 401) {
          expireSession();
        }

        setError(
          cause instanceof Error ? cause.message : "Couldn’t load clubs.",
        );
        setLoaded({ key: requestKey, data: null });
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [
    userId,
    isSiteAdmin,
    view,
    clubId,
    search,
    universityId,
    offset,
    reviewStatus,
    requestKey,
    expireSession,
  ]);

  function refresh() {
    setRevision((value) => value + 1);
  }

  function closeModal() {
    setModal(null);
    setError("");
  }

  function openModal(value: Modal) {
    setError("");
    setModal(value);
  }

  async function mutate(path: string, method: string, body?: unknown) {
    if (pending) {
      return false;
    }

    setPending(true);
    setError("");
    setNotice("");

    try {
      await request(path, {
        method,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      refresh();
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        expireSession();
      }

      setError(cause instanceof Error ? cause.message : "Try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  function listingUrl(nextOffset: number) {
    const query = new URLSearchParams({
      ...(search ? { q: search } : {}),
      ...(universityId ? { universityId } : {}),
      offset: String(nextOffset),
    });

    return `/discover?${query}`;
  }

  function reviewUrl(nextOffset: number) {
    const query = new URLSearchParams({
      status: reviewStatus,
      offset: String(nextOffset),
    });

    return `/admin/applications?${query}`;
  }

  return {
    data,
    loading,
    pending,
    error,
    notice,
    modal,
    search,
    universityId,
    offset,
    reviewStatus,
    editingId,
    editing,
    clubId,
    userId,
    refresh,
    mutate,
    setNotice,
    openModal,
    closeModal,
    listingUrl,
    reviewUrl,
  };
}

export type ClubWorkspace = ReturnType<typeof useClubWorkspace>;
