// src/api/notification.js
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import useUserProfile from "../hooks/useUserProfile";
import { useSocket } from "../hooks/useSocket";

export function useNotifications() {
  const { user } = useUserProfile();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await api.get("/notifications/all");
      return data?.data || [];
    },
    refetchOnWindowFocus: true,
    refetchInterval: 4000, // Real-time polling so user doesn't need to switch tabs
    staleTime: 0,
  });

  useSocket((data) => {
    if (!user?.id) return;

    if (data?.id) {
      queryClient.setQueryData(["notifications", user?.id], (prev = []) => {
        const exists = prev.some((n) => n.id === data.id);
        return exists ? prev : [data, ...prev];
      });
    }

    // Invalidate notifications, missions, and feeds so current page updates immediately
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
    queryClient.invalidateQueries({ queryKey: ["mission"] });
    queryClient.invalidateQueries({ queryKey: ["missions"] });
    queryClient.invalidateQueries({ queryKey: ["orgMissions"] });
    queryClient.invalidateQueries({ queryKey: ["feeds"] });
  });

  const markAllAsRead = async () => {
    queryClient.setQueryData(["notifications", user?.id], (prev = []) =>
      prev.map((n) => ({ ...n, status: "read" }))
    );

    try {
      await api.put("/notifications/read");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err) {
      console.log("Mark all read failed silently", err);
    }
  };

  const unreadCount =
    query.data?.filter((n) => n.status === "unread").length || 0;

  return { ...query, markAllAsRead, unreadCount };
}
