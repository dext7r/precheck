export interface BuildInfo {
  buildTime: string
  platform: string
  platformUrl: string
  git: {
    commitHash: string
    commitShort: string
    commitMessage: string
    author: string
    repo: string
    branch: string
  }
}
