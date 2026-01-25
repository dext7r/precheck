import { NextResponse } from "next/server"

interface LinuxDoStats {
  users_count: number
  active_users_last_day: number
  topics_count: number
  posts_count: number
}

interface AboutResponse {
  about: {
    stats: LinuxDoStats
  }
}

export async function GET() {
  try {
    const res = await fetch("https://linux.do/about.json", {
      next: { revalidate: 3600 }, // 缓存 1 小时
    })

    if (!res.ok) {
      throw new Error("Failed to fetch")
    }

    const data: AboutResponse = await res.json()
    const { stats } = data.about

    return NextResponse.json({
      users_count: stats.users_count,
      active_users_last_day: stats.active_users_last_day,
      topics_count: stats.topics_count,
      posts_count: stats.posts_count,
    })
  } catch {
    // 返回默认值
    return NextResponse.json({
      users_count: 85000,
      active_users_last_day: 25000,
      topics_count: 360000,
      posts_count: 12700000,
    })
  }
}
