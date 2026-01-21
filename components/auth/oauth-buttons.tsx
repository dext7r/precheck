"use client"

import type React from "react"

import { Github, Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface OAuthButtonsProps {
  providers: Array<{ id: string; name: string }>
  isLoading?: boolean
  onOAuth: (provider: string) => void
  dict: {
    orContinueWith: string
  }
}

const providerIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  github: Github,
  google: Mail,
}

export function OAuthButtons({ providers, isLoading, onOAuth, dict }: OAuthButtonsProps) {
  // 如果没有启用任何 OAuth 提供商，不渲染任何内容
  if (providers.length === 0) {
    return null
  }

  return (
    <>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{dict.orContinueWith}</span>
        </div>
      </div>

      <div className={`grid gap-4 ${providers.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
        {providers.map((provider) => {
          const Icon = providerIcons[provider.id] || Mail
          return (
            <Button
              key={provider.id}
              type="button"
              variant="outline"
              onClick={() => onOAuth(provider.id)}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icon className="mr-2 h-4 w-4" />
              )}
              {provider.name}
            </Button>
          )
        })}
      </div>
    </>
  )
}
