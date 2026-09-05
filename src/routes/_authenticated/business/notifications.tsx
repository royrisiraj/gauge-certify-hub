import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  AlertTriangle,
  MailCheck,
  Calendar,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { PageHeader } from "@/components/emaap/PageHeader";
import { EmptyState } from "@/components/emaap/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/business/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — e-Maap" },
      {
        name: "description",
        content:
          "Metrology verification updates, officer assignment alerts, and certificate expiry notices.",
      },
    ],
  }),
  component: BusinessNotificationsPage,
});

function BusinessNotificationsPage() {
  const queryClient = useQueryClient();
  const { data: account, isLoading: accountLoading } = useAccount();
  const userId = account?.userId;

  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Query Notifications
  const {
    data: notifications = [],
    isLoading: notificationsLoading,
    error: notificationsError,
  } = useQuery({
    queryKey: ["emaap", "notifications", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, title, body, link, type, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as NotificationRow[]) ?? [];
    },
    enabled: !!userId,
  });

  // Mark single notification as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap", "notifications", userId] });
    },
  });

  // Mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap", "notifications", userId] });
    },
  });

  const isLoading = accountLoading || notificationsLoading;

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const displayedNotifications =
    filter === "unread" ? notifications.filter((n) => !n.read_at) : notifications;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="size-8 animate-spin text-[#000080]" aria-hidden="true" />
        <p className="mt-3 text-[14px] font-medium text-slate-600">Loading notifications…</p>
      </div>
    );
  }

  if (notificationsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        <AlertTriangle className="mx-auto size-8 text-red-600" aria-hidden="true" />
        <h2 className="mt-2 text-lg font-bold">Unable to load notifications</h2>
        <p className="mt-1 text-sm">
          {notificationsError instanceof Error
            ? notificationsError.message
            : "Database query failed"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Official alerts regarding verification requests, officer inspection visits, and certificate renewals."
        crumbs={[{ label: "Dashboard", to: "/business/dashboard" }, { label: "Notifications" }]}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="text-[#000080] border-slate-300 font-medium"
            >
              <MailCheck className="size-4 mr-1.5" aria-hidden="true" />
              Mark All Read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <Button
          variant={filter === "all" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("all")}
          className={
            filter === "all" ? "bg-[#000080] text-white" : "text-slate-600 hover:text-slate-900"
          }
        >
          All Notifications ({notifications.length})
        </Button>
        <Button
          variant={filter === "unread" ? "default" : "ghost"}
          size="sm"
          onClick={() => setFilter("unread")}
          className={
            filter === "unread" ? "bg-[#000080] text-white" : "text-slate-600 hover:text-slate-900"
          }
        >
          Unread Only {unreadCount > 0 ? `(${unreadCount})` : ""}
        </Button>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You're all caught up! You will receive updates here when verification officers review your requests or when certificates require renewal."
          action={
            <Button asChild className="bg-[#000080] text-white">
              <Link to="/business/dashboard">Return to Dashboard</Link>
            </Button>
          }
        />
      ) : displayedNotifications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          <CheckCircle2 className="mx-auto size-8 text-emerald-600" aria-hidden="true" />
          <p className="mt-2 text-[15px] font-medium">No unread notifications.</p>
          <Button variant="outline" size="sm" onClick={() => setFilter("all")} className="mt-3">
            View All Notifications
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedNotifications.map((notif) => {
            const isUnread = !notif.read_at;

            return (
              <div
                key={notif.id}
                className={`rounded-xl border p-4 sm:p-5 transition-colors ${
                  isUnread ? "border-blue-200 bg-blue-50/40 shadow-xs" : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg ${
                        isUnread ? "bg-[#000080] text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <Bell className="size-4" aria-hidden="true" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-bold text-slate-900">{notif.title}</h3>
                        {isUnread ? (
                          <Badge className="bg-[#000080] text-white text-[11px] font-medium h-5">
                            New
                          </Badge>
                        ) : null}
                      </div>

                      <p className="text-[14px] text-slate-700 leading-relaxed">{notif.body}</p>

                      <div className="flex items-center gap-3 pt-1 text-[12px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" aria-hidden="true" />
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                    {notif.link ? (
                      <Button asChild variant="outline" size="sm" className="h-8 text-[12px]">
                        <Link to={notif.link}>
                          <ExternalLink className="size-3.5 mr-1" aria-hidden="true" />
                          Open
                        </Link>
                      </Button>
                    ) : null}

                    {isUnread ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markReadMutation.mutate(notif.id)}
                        disabled={markReadMutation.isPending}
                        className="h-8 text-[12px] text-slate-600 hover:text-slate-900"
                      >
                        Mark as read
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
