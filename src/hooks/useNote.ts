"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { getFirstNote, createDefaultNote, saveNote } from "@/lib/notes"

const SAVE_DELAY_MS = 500

export function useNote() {
  const [noteId, setNoteId] = useState<number | null>(null)
  const [markdown, setMarkdownState] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const initialized = useRef(false)
  const skipNextSave = useRef(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestMarkdownRef = useRef(markdown)
  const noteIdRef = useRef(noteId)

  // Keep refs in sync with state
  latestMarkdownRef.current = markdown
  noteIdRef.current = noteId

  // Load or create a note on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function init() {
      const existing = await getFirstNote()
      if (existing) {
        setNoteId(existing.id)
        setMarkdownState(existing.body)
      } else {
        const created = await createDefaultNote()
        setNoteId(created.id)
        setMarkdownState(created.body)
      }
      setIsLoading(false)
    }

    init()
  }, [])

  // Debounced save whenever markdown changes
  useEffect(() => {
    if (isLoading || noteId === null) return

    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    timeoutRef.current = setTimeout(() => {
      saveNote(noteId, markdown)
    }, SAVE_DELAY_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [markdown, noteId, isLoading])

  // Flush unsaved changes on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (noteIdRef.current !== null) {
        saveNote(noteIdRef.current, latestMarkdownRef.current)
      }
    }
  }, [])

  const setMarkdown = useCallback((value: string) => {
    setMarkdownState(value)
  }, [])

  return { markdown, setMarkdown, isLoading }
}
