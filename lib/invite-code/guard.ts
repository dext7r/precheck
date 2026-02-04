import { type NextRequest, NextResponse } from "next/server"
import { createApiErrorResponse } from "@/lib/api/error-response"
import { ApiErrorKeys } from "@/lib/api/error-keys"

const STORAGE_ENABLED =
  process.env.INVITE_CODE_STORAGE_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_INVITE_CODE_STORAGE_ENABLED === "true"

export function isInviteCodeStorageEnabled(): boolean {
  return STORAGE_ENABLED
}

export async function ensureInviteCodeStorageEnabled(
  request: NextRequest,
): Promise<NextResponse | null> {
  if (STORAGE_ENABLED) {
    return null
  }

  return createApiErrorResponse(request, ApiErrorKeys.admin.inviteCodes.storageDisabled, {
    status: 410,
  })
}
