"use client"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { normalizeLocalPart } from "@/lib/validators/email"
import { useEffect, useMemo, useState } from "react"

const CUSTOM_DOMAIN_VALUE = "__custom__"

type EmailWithDomainInputProps = {
  value: string
  domains: string[]
  onChange: (email: string) => void
  selectPlaceholder?: string
  inputId?: string
  inputPlaceholder?: string
  disabled?: boolean
  className?: string
}

export function EmailWithDomainInput({
  value,
  domains,
  onChange,
  selectPlaceholder,
  inputId,
  inputPlaceholder,
  disabled,
  className,
}: EmailWithDomainInputProps) {
  const domainOptions = useMemo(() => [...domains], [domains])
  const [localPart, setLocalPart] = useState("")
  const [selectedDomain, setSelectedDomain] = useState(domainOptions[0] ?? "")
  const [customDomain, setCustomDomain] = useState("")
  const [useCustomDomain, setUseCustomDomain] = useState(false)

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (!value) {
        setLocalPart("")
        setUseCustomDomain(false)
        setCustomDomain("")
        setSelectedDomain(domainOptions[0] ?? "")
        return
      }

      const [local, domain] = value.split("@")
      const trimmedLocal = local ?? value
      const trimmedDomain = domain ?? ""
      const normalizedLocal = normalizeLocalPart(trimmedLocal)

      setLocalPart(normalizedLocal)

      if (!trimmedDomain) {
        setUseCustomDomain(false)
        setCustomDomain("")
        setSelectedDomain(domainOptions[0] ?? "")
        return
      }

      if (domainOptions.includes(trimmedDomain)) {
        setUseCustomDomain(false)
        setCustomDomain("")
        setSelectedDomain(trimmedDomain)
      } else {
        setUseCustomDomain(true)
        setCustomDomain(trimmedDomain)
        setSelectedDomain(CUSTOM_DOMAIN_VALUE)
      }
    })

    return () => cancelAnimationFrame(frame)
  }, [value, domainOptions])

  const commitValue = (
    nextLocal: string,
    nextDomain: string,
    nextCustom: string,
    customFlag: boolean,
  ) => {
    const normalizedLocal = normalizeLocalPart(nextLocal)

    if (!normalizedLocal) {
      onChange("")
      return
    }

    const domainToUse = customFlag ? nextCustom.trim() : nextDomain.trim()

    if (!domainToUse) {
      onChange(normalizedLocal)
      return
    }

    onChange(`${normalizedLocal}@${domainToUse}`)
  }

  const handleLocalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedLocal = normalizeLocalPart(event.target.value)
    setLocalPart(sanitizedLocal)
    commitValue(sanitizedLocal, selectedDomain, customDomain, useCustomDomain)
  }

  const handleDomainChange = (nextDomain: string) => {
    if (nextDomain === CUSTOM_DOMAIN_VALUE) {
      setUseCustomDomain(true)
      setSelectedDomain(CUSTOM_DOMAIN_VALUE)
      commitValue(localPart, "", customDomain, true)
      return
    }

    setUseCustomDomain(false)
    setCustomDomain("")
    setSelectedDomain(nextDomain)
    commitValue(localPart, nextDomain, "", false)
  }

  const handleCustomDomainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextCustom = event.target.value
    setCustomDomain(nextCustom)
    commitValue(localPart, "", nextCustom, true)
  }

  const sanitizeFallbackEmail = (rawEmail: string) => {
    const [rawLocal, ...rest] = rawEmail.split("@")
    const normalizedLocal = normalizeLocalPart(rawLocal ?? "")

    if (!rest.length) {
      return normalizedLocal
    }

    const domain = rest.join("@").trim()
    if (!domain) {
      return normalizedLocal
    }

    return `${normalizedLocal}@${domain}`
  }

  const currentSelectValue = useMemo(() => {
    if (useCustomDomain) {
      return CUSTOM_DOMAIN_VALUE
    }
    return selectedDomain || domainOptions[0] || ""
  }, [useCustomDomain, selectedDomain, domainOptions])

  if (!domainOptions.length) {
    return (
      <Input
        id={inputId}
        type="email"
        value={value}
        onChange={(event) => onChange(sanitizeFallbackEmail(event.target.value))}
        placeholder={inputPlaceholder}
        disabled={disabled}
        className={className}
      />
    )
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex w-full items-center gap-2">
        <div className="flex-1">
          <Input
            id={inputId}
            type="text"
            value={localPart}
            onChange={handleLocalChange}
            placeholder={inputPlaceholder}
            disabled={disabled}
          />
        </div>
        <span className="text-muted-foreground">@</span>
        <div className="flex-1">
          <Select value={currentSelectValue} onValueChange={handleDomainChange} disabled={disabled}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={selectPlaceholder ?? "选择后缀"} />
            </SelectTrigger>
            <SelectContent position="popper">
              {domainOptions.map((domain) => (
                <SelectItem key={domain} value={domain}>
                  {domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {useCustomDomain && (
        <Input
          type="text"
          value={customDomain}
          onChange={handleCustomDomainChange}
          placeholder={selectPlaceholder ?? "Enter domain manually"}
          disabled={disabled}
        />
      )}
    </div>
  )
}
