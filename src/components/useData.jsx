import { useQuery } from "@tanstack/react-query";
import { User } from "@/entities/User";
import { Department } from "@/entities/Department";
import { Task } from "@/entities/Task";
import { Service } from "@/entities/Service";
import { UserStar } from "@/entities/UserStar";
import { getPublicUsers } from "@/functions/getPublicUsers";

// Cache configuration
const STALE_TIMES = {
  STATIC: 1000 * 60 * 30, // 30 minutes for rarely changing data (Users, Depts)
  DYNAMIC: 1000 * 60 * 1, // 1 minute for dynamic data (Tasks, Services)
};

// --- Core Data Hooks ---

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: () => User.me(),
    staleTime: STALE_TIMES.STATIC,
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => Department.list(),
    staleTime: STALE_TIMES.STATIC,
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      try {
        // Try backend function first (faster/optimized)
        const response = await getPublicUsers();
        if (response?.data?.users) return response.data.users;
      } catch (e) {
        console.warn("Backend users fetch failed, falling back to Entity.list");
      }
      // Fallback
      return User.list();
    },
    staleTime: STALE_TIMES.STATIC,
  });
}

// --- Task & Service Hooks ---

export function useTasks(isAdmin, userEmail) {
  return useQuery({
    queryKey: ['tasks', isAdmin ? 'all' : userEmail],
    queryFn: async () => {
      if (isAdmin) return Task.list("-created_date");
      return Task.filter({ assigned_to: userEmail }, "-created_date");
    },
    staleTime: STALE_TIMES.DYNAMIC,
    enabled: !!userEmail || isAdmin !== undefined
  });
}

export function useServices(isAdmin, userEmail) {
  return useQuery({
    queryKey: ['services', isAdmin ? 'all' : userEmail],
    queryFn: async () => {
      if (isAdmin) return Service.list("-created_date");
      return Service.filter({ assigned_to: userEmail }, "-created_date");
    },
    staleTime: STALE_TIMES.DYNAMIC,
    enabled: !!userEmail || isAdmin !== undefined
  });
}

// --- Ranking Hooks ---

export function useStars() {
  return useQuery({
    queryKey: ['stars'],
    queryFn: () => UserStar.list("-earned_date"),
    staleTime: STALE_TIMES.DYNAMIC,
  });
}