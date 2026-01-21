const { generatorHandler } = require("@prisma/generator-helper")
const path = require("node:path")
const fs = require("node:fs/promises")

const scalarTypeMap = {
  String: "string",
  Int: "number",
  BigInt: "bigint",
  Float: "number",
  Decimal: "Prisma.Decimal",
  Boolean: "boolean",
  DateTime: "Date",
  Json: "Prisma.JsonValue",
  Bytes: "Buffer",
}

const validIdentifierRegex = /^[A-Za-z_$][A-Za-z0-9_$]*$/

function formatPropertyName(name) {
  return validIdentifierRegex.test(name) ? name : JSON.stringify(name)
}

function fieldBaseType(field) {
  if (field.kind === "scalar") {
    return scalarTypeMap[field.type] || "unknown"
  }
  if (field.kind === "enum") {
    return field.type
  }
  if (field.kind === "object") {
    return field.type
  }
  return "unknown"
}

function renderField(field) {
  const baseType = fieldBaseType(field)
  const listType = field.isList ? `${baseType}[]` : baseType
  const finalType = field.isRequired ? listType : `${listType} | null`
  return `  ${formatPropertyName(field.name)}: ${finalType}`
}

function renderEnum(enumDef) {
  const values = enumDef.values.map((value) => JSON.stringify(value.name)).join(" | ")
  return `export type ${enumDef.name} = ${values}`
}

function renderModel(model) {
  const lines = [`export interface ${model.name} {`]
  for (const field of model.fields) {
    lines.push(renderField(field))
  }
  lines.push("}")
  return lines.join("\n")
}

function needsPrismaImport(dmmf) {
  for (const model of dmmf.datamodel.models) {
    for (const field of model.fields) {
      if (field.kind === "scalar" && (field.type === "Decimal" || field.type === "Json")) {
        return true
      }
    }
  }
  return false
}

function resolveOutputDir(options) {
  if (options.generator.output?.value) {
    return options.generator.output.value
  }
  const schemaDir = options.schemaPath ? path.dirname(options.schemaPath) : process.cwd()
  return path.join(schemaDir, "types")
}

generatorHandler({
  onManifest() {
    return {
      defaultOutput: "./types",
      prettyName: "Prisma DTS Generator",
    }
  },
  async onGenerate(options) {
    const outputDir = resolveOutputDir(options)
    await fs.mkdir(outputDir, { recursive: true })

    const lines = []
    if (needsPrismaImport(options.dmmf)) {
      lines.push('import type { Prisma } from "@prisma/client"')
      lines.push("")
    }

    const enums = options.dmmf.datamodel.enums.map(renderEnum)
    if (enums.length > 0) {
      lines.push(enums.join("\n\n"))
      lines.push("")
    }

    const models = options.dmmf.datamodel.models.map(renderModel)
    if (models.length > 0) {
      lines.push(models.join("\n\n"))
      lines.push("")
    }

    const outputPath = path.join(outputDir, "prisma.d.ts")
    await fs.writeFile(outputPath, `${lines.join("\n").trim()}\n`, "utf8")
  },
})
