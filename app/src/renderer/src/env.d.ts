/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_GITHUB_TOKEN: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
