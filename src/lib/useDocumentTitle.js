import { useEffect } from 'react'

// Per-page <title>, so a shared link or a browser tab says which page it is.
export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Solitaire Dynamics` : 'Solitaire Dynamics · MTB Suspension Tools'
  }, [title])
}
