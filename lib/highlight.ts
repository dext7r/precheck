import { codeToHtml } from "shiki"

const THEME_LIGHT = "github-light"
const THEME_DARK = "github-dark"

export async function highlightCode(code: string, lang: string = "text") {
  try {
    const html = await codeToHtml(code, {
      lang,
      themes: {
        light: THEME_LIGHT,
        dark: THEME_DARK,
      },
    })
    return html
  } catch {
    return null
  }
}
