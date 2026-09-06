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
import { formatDateTime } from "@/lib/emaap/format";

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/_authenticated/authority/notifications")({
  head: () => ({
    meta: [
      { title: "Officer Notifications — e-Maap Authority" },
      {
        name: "description",
        content:
          "Metrology verification updates, assignment alerts, and official inspection notices.",
      },
    ],
  }),
  component: AuthorityNotificationsPage,
});

function AuthorityNotificationsPage() {
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
    queryKey: ["emaap", "authority", "notifications", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, title, body, link, read_at, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as NotificationRow[]) ?? [];
    },
    enabled: !!userId,
  });

  // Mark single as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emaap", "authority", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["emaap", "notifications"] });
    },
  });

  // Mark all as read
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
      queryClient.invalidateQueries({ queryKey: ["emaap", "authority", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["emaap", "notifications"] });
    },
  });

  const isLoading = accountLoading || notificationsLoading;

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read_at;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Official assignment alerts and inspection updates."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="gap-1.5 text-xs text-slate-700"
            >
              <MailCheck className="size-3.5" />
              Mark all read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

      {/* ── Filter toggles ── */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className="text-xs"
        >
          All Notifications ({notifications.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "unread" ? "default" : "outline"}
          onClick={() => setFilter("unread")}
          className="text-xs"
        >
          Unread ({unreadCount})
        </Button>
      </div>

      {notificationsError ? (
        <div className="surface-card flex items-center gap-3 border-error/30 bg-error-subtle p-4">
          <AlertTriangle className="size-5 text-error" />
          <p className="text-sm text-error">
            Failed to load notifications: {(notificationsError as Error).message}
          </p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filter === "unread" ? "No unread notifications" : "Inbox is empty"}
          description={
            filter === "unread"
              ? "You are completely up to date. Check back later for new alerts."
              : "No verification requests or assignments have triggered notifications yet."
          }
        />
      ) : (
        <div className="surface-card divide-y divide-slate-100">
          {filteredNotifications.map((item) => {
            const isUnread = !item.read_at;

            return (
              <div
                key={item.id}
                className={`flex flex-wrap items-start justify-between gap-3 px-5 py-4 transition-colors ${
                  isUnread ? "bg-amber-50/20" : ""
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-medium ${
                        isUnread ? "font-semibold text-slate-900" : "text-slate-800"
                      }`}
                    >
                      {item.title}
                    </p>
                    {isUnread && (
                      <Badge className="bg-[#ff671f] text-[10px] text-white">New</Badge>
                    )}
                  </div>
                  {item.body && <p className="text-xs text-slate-600 leading-relaxed">{item.body}</p>}
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {formatDateTime(item.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-0.5">
                  {item.link && (
                    <Link to={item.link}>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs text-slate-600">
                        View Details
                        <ExternalLink className="size-3" />
                      </Button>
                    </Link>
                  )}
                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsReadMutation.mutate(item.id)}
                      disabled={markAsReadMutation.isPending}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Mark read
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
