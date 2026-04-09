"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  getFirstNote,
  createDefaultNote,
  saveNote,
  getAllNotes,
  updateNoteTitle,
  getNoteById,
  softDeleteNote,
} from "@/lib/notes"

const SAVE_DELAY_MS = 500

// Grab the title from the first line of markdown (strips leading # symbols)
function extractTitle(markdown: string): string {
  const firstLine = markdown.split("\n")[0]?.replace(/^#+\s*/, "").trim()
  return firstLine || "Untitled"
}

export function useNote() {
  const [noteId, setNoteId] = useState<number | null>(null)
  const [markdown, setMarkdownState] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // The list of all notes shown in the sidebar (lightweight — no body content)
  const [notes, setNotes] = useState<{ id: number; title: string; updatedAt: Date }[]>([])

  const initialized = useRef(false)
  const skipNextSave = useRef(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestMarkdownRef = useRef(markdown)
  const noteIdRef = useRef(noteId)

  // Keep refs in sync with state so our cleanup/flush functions always have the latest values
  latestMarkdownRef.current = markdown
  noteIdRef.current = noteId

  // Save immediately — cancels any pending debounce timer first.
  // Think of this as the app hitting Ctrl+S for you before switching notes.
  const flushSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (noteIdRef.current !== null) {
      const title = extractTitle(latestMarkdownRef.current)
      await saveNote(noteIdRef.current, latestMarkdownRef.current)
      await updateNoteTitle(noteIdRef.current, title)

      // Also update the sidebar so the title shows the latest text
      const savedId = noteIdRef.current
      setNotes((prev) =>
        prev.map((n) => (n.id === savedId ? { ...n, title, updatedAt: new Date() } : n))
      )
    }
  }, [])

  // Load or create a note on mount, and fetch the full note list for the sidebar
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

      // Load the sidebar list
      const allNotes = await getAllNotes()
      setNotes(allNotes)

      setIsLoading(false)
    }

    init()
  }, [])

  // Debounced save — waits 500ms after the user stops typing, then persists
  useEffect(() => {
    if (isLoading || noteId === null) return

    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    timeoutRef.current = setTimeout(() => {
      const title = extractTitle(markdown)
      saveNote(noteId, markdown)
      updateNoteTitle(noteId, title)

      // Update the sidebar list so titles stay fresh without re-reading the database
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, title, updatedAt: new Date() } : n))
      )
    }, SAVE_DELAY_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [markdown, noteId, isLoading])

  // Safety net — flush any unsaved changes if the component unmounts
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

  // Switch to a different note — saves the current one first so nothing is lost
  const selectNote = useCallback(async (id: number) => {
    await flushSave()

    const note = await getNoteById(id)
    if (!note) return

    // Tell the auto-save to skip the next change (it's a load, not an edit)
    skipNextSave.current = true
    setNoteId(note.id)
    setMarkdownState(note.body)
  }, [flushSave])

  // Create a brand new note and switch to it
  const createNote = useCallback(async () => {
    await flushSave()

    const note = await createDefaultNote()

    skipNextSave.current = true
    setNoteId(note.id)
    setMarkdownState(note.body)

    // Add the new note to the top of the sidebar list
    setNotes((prev) => [
      { id: note.id, title: note.title, updatedAt: note.updatedAt },
      ...prev,
    ])
  }, [flushSave])

  // Delete a note and figure out what to show next — like closing a browser tab.
  const deleteNote = useCallback(async (id: number) => {
    const isDeletingActiveNote = id === noteIdRef.current

    // If we're deleting the note we're currently editing, cancel any pending save
    // (no point saving something that's going to the trash)
    if (isDeletingActiveNote && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    await softDeleteNote(id)

    // Remove the deleted note from the sidebar list
    const remaining = notes.filter((n) => n.id !== id)
    setNotes(remaining)

    // If we deleted the note we were looking at, we need to switch to something else
    if (isDeletingActiveNote) {
      if (remaining.length > 0) {
        // Switch to the most recent note (first in the list)
        const next = await getNoteById(remaining[0].id)
        if (next) {
          skipNextSave.current = true
          setNoteId(next.id)
          setMarkdownState(next.body)
        }
      } else {
        // No notes left — create a fresh blank one
        const fresh = await createDefaultNote()
        skipNextSave.current = true
        setNoteId(fresh.id)
        setMarkdownState(fresh.body)
        setNotes([{ id: fresh.id, title: fresh.title, updatedAt: fresh.updatedAt }])
      }
    }
  }, [notes])

  return { markdown, setMarkdown, isLoading, notes, noteId, selectNote, createNote, deleteNote }
}
