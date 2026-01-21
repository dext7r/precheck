export interface AdminStats {
  totalUsers: number
  activeUsers: number
  newUsers: number
  totalPosts: number
}

export interface User {
  id: string
  name: string | null
  email: string
  role: string
  status: string
  createdAt: string
}

export interface Post {
  id: string
  title: string
  content: string | null
  status: string
  views: number
  author: {
    name: string | null
    email: string
  }
  createdAt: string
}

export interface AnalyticsData {
  userGrowth: Array<{ month: string; users: number }>
  postStats: Array<{ month: string; posts: number }>
  viewStats: Array<{ month: string; views: number }>
  topCountries: Array<{ country: string; users: number; percentage: number }>
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export async function getAdminStats(): Promise<AdminStats> {
  return fetchAPI<AdminStats>("/api/admin/stats")
}

export async function getUsers(params?: {
  search?: string
  page?: number
  limit?: number
}): Promise<{ users: User[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.page) query.append("page", String(params.page))
  if (params?.limit) query.append("limit", String(params.limit))

  const queryString = query.toString()
  return fetchAPI(`/api/admin/users${queryString ? `?${queryString}` : ""}`)
}

export async function getUserById(id: string): Promise<User> {
  return fetchAPI<User>(`/api/admin/users/${id}`)
}

export async function updateUserRole(id: string, role: string): Promise<User> {
  return fetchAPI<User>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({ role }),
  })
}

export async function updateUserStatus(id: string, status: string): Promise<User> {
  return fetchAPI<User>(`/api/admin/users/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  })
}

export async function deleteUser(id: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/api/admin/users/${id}`, {
    method: "DELETE",
  })
}

export async function getPosts(params?: {
  search?: string
  status?: string
  page?: number
  limit?: number
}): Promise<{ posts: Post[]; total: number }> {
  const query = new URLSearchParams()
  if (params?.search) query.append("search", params.search)
  if (params?.status) query.append("status", params.status)
  if (params?.page) query.append("page", String(params.page))
  if (params?.limit) query.append("limit", String(params.limit))

  const queryString = query.toString()
  return fetchAPI(`/api/admin/posts${queryString ? `?${queryString}` : ""}`)
}

export async function getPostById(id: string): Promise<Post> {
  return fetchAPI<Post>(`/api/admin/posts/${id}`)
}

export async function updatePostStatus(id: string, status: string): Promise<Post> {
  return fetchAPI<Post>(`/api/admin/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  })
}

export async function deletePost(id: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`/api/admin/posts/${id}`, {
    method: "DELETE",
  })
}

export async function getAnalytics(): Promise<AnalyticsData> {
  return fetchAPI<AnalyticsData>("/api/admin/analytics")
}
