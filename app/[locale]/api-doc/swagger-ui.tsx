"use client"

import SwaggerUIReact from "swagger-ui-react"
import "swagger-ui-react/swagger-ui.css"
import { openApiSpec } from "@/lib/openapi-spec"

export function SwaggerUI() {
  return (
    <div className="min-h-screen bg-white">
      <SwaggerUIReact spec={openApiSpec} />
    </div>
  )
}
