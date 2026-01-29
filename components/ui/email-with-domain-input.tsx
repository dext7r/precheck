"use client"

import { Check, ChevronsUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
    const inputValue = event.target.value

    // 用户粘贴完整邮箱时处理
    if (inputValue.includes("@")) {
      const [rawLocal, ...domainParts] = inputValue.split("@")
      const pastedDomain = domainParts.join("@").trim()
      const sanitizedLocal = normalizeLocalPart(rawLocal || "")

      setLocalPart(sanitizedLocal)

      // 域名在允许列表中时自动选择
      if (pastedDomain && domainOptions.includes(pastedDomain)) {
        setUseCustomDomain(false)
        setCustomDomain("")
        setSelectedDomain(pastedDomain)
        commitValue(sanitizedLocal, pastedDomain, "", false)
      } else {
        // 域名不在列表中，只保留用户名
        commitValue(sanitizedLocal, selectedDomain, customDomain, useCustomDomain)
      }
      return
    }

    const sanitizedLocal = normalizeLocalPart(inputValue)
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

  const [open, setOpen] = useState(false)

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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                disabled={disabled}
                className="w-full justify-between font-normal"
              >
                {currentSelectValue && currentSelectValue !== CUSTOM_DOMAIN_VALUE
                  ? currentSelectValue
                  : (selectPlaceholder ?? "选择后缀")}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
              <Command>
                <CommandInput placeholder="搜索后缀..." />
                <CommandList>
                  <CommandEmpty>未找到匹配项</CommandEmpty>
                  <CommandGroup>
                    {domainOptions.map((domain) => (
                      <CommandItem
                        key={domain}
                        value={domain}
                        onSelect={() => {
                          handleDomainChange(domain)
                          setOpen(false)
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            currentSelectValue === domain ? "opacity-100" : "opacity-0",
                          )}
                        />
                        {domain}
                      </CommandItem>
                    ))}
                    <CommandItem
                      key={CUSTOM_DOMAIN_VALUE}
                      value="other"
                      onSelect={() => {
                        handleDomainChange(CUSTOM_DOMAIN_VALUE)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          currentSelectValue === CUSTOM_DOMAIN_VALUE ? "opacity-100" : "opacity-0",
                        )}
                      />
                      其他
                    </CommandItem>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
