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
  moveNoteToFolder,
} from "@/lib/notes"
import {
  createFolder,
  getAllFolders,
  renameFolder,
  softDeleteFolder,
} from "@/lib/folders"
import type { Folder } from "@/lib/db"

const SAVE_DELAY_MS = 500

// pull the title from the first line, stripping any leading #'s
function extractTitle(markdown: string): string {
  const firstLine = markdown.split("\n")[0]?.replace(/^#+\s*/, "").trim()
  return firstLine || "Untitled"
}

export function useNote() {
  const [noteId, setNoteId] = useState<number | null>(null)
  const [markdown, setMarkdownState] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // sidebar data
  const [notes, setNotes] = useState<{ id: number; title: string; updatedAt: Date; folderId: number | null }[]>([])
  const [folders, setFolders] = useState<Folder[]>([])

  const initialized = useRef(false)
  const skipNextSave = useRef(true)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestMarkdownRef = useRef(markdown)
  const noteIdRef = useRef(noteId)

  // keep refs in sync so flush/cleanup always has the latest values
  latestMarkdownRef.current = markdown
  noteIdRef.current = noteId

  // force-save now — cancels any pending debounce and writes immediately
  const flushSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (noteIdRef.current !== null) {
      const title = extractTitle(latestMarkdownRef.current)
      await saveNote(noteIdRef.current, latestMarkdownRef.current)
      await updateNoteTitle(noteIdRef.current, title)

      // update sidebar to match
      const savedId = noteIdRef.current
      setNotes((prev) =>
        prev.map((n) => (n.id === savedId ? { ...n, title, updatedAt: new Date() } : n))
      )
    }
  }, [])

  // on mount: load existing note or create a default, then populate sidebar
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

      // populate sidebar
      const allNotes = await getAllNotes()
      setNotes(allNotes)

      const allFolders = await getAllFolders()
      setFolders(allFolders)

      setIsLoading(false)
    }

    init()
  }, [])

  // auto-save 500ms after the user stops typing
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

      // keep sidebar title in sync
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, title, updatedAt: new Date() } : n))
      )
    }, SAVE_DELAY_MS)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [markdown, noteId, isLoading])

  // flush on unmount so we don't lose unsaved changes
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

  // switch to a different note (flushes current note first)
  const selectNote = useCallback(async (id: number) => {
    await flushSave()

    const note = await getNoteById(id)
    if (!note) return

    // skip the next auto-save — this is a load, not a user edit
    skipNextSave.current = true
    setNoteId(note.id)
    setMarkdownState(note.body)
  }, [flushSave])

  // create a blank note and switch to it
  // if folderId is passed, use that; otherwise inherit from the active note
  const createNote = useCallback(async (folderId?: number | null) => {
    await flushSave()

    const targetFolderId = folderId !== undefined
      ? folderId
      : (notes.find((n) => n.id === noteIdRef.current)?.folderId ?? null)

    const note = await createDefaultNote(targetFolderId)

    skipNextSave.current = true
    setNoteId(note.id)
    setMarkdownState(note.body)

    // put it at the top of the sidebar
    setNotes((prev) => [
      { id: note.id, title: note.title, updatedAt: note.updatedAt, folderId: note.folderId },
      ...prev,
    ])
  }, [flushSave, notes])

  // delete a note and switch to another one (or create a new one if none left)
  const deleteNote = useCallback(async (id: number) => {
    const isDeletingActiveNote = id === noteIdRef.current

    // no point saving a note we're about to trash
    if (isDeletingActiveNote && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    await softDeleteNote(id)

    const remaining = notes.filter((n) => n.id !== id)
    setNotes(remaining)

    // if we deleted the active note, switch to another one
    if (isDeletingActiveNote) {
      if (remaining.length > 0) {
        const next = await getNoteById(remaining[0].id)
        if (next) {
          skipNextSave.current = true
          setNoteId(next.id)
          setMarkdownState(next.body)
        }
      } else {
        // nothing left, start fresh
        const fresh = await createDefaultNote()
        skipNextSave.current = true
        setNoteId(fresh.id)
        setMarkdownState(fresh.body)
        setNotes([{ id: fresh.id, title: fresh.title, updatedAt: fresh.updatedAt, folderId: fresh.folderId }])
      }
    }
  }, [notes])

  // --- folder operations ---

  // create a folder (top-level by default, or nested if parentId is given)
  const addFolder = useCallback(async (title: string, parentId: number | null = null) => {
    const folder = await createFolder(title, parentId)
    setFolders((prev) => [...prev, folder].sort((a, b) => a.title.localeCompare(b.title)))
  }, [])

  // rename a folder and re-sort the list
  const editFolderName = useCallback(async (id: number, title: string) => {
    await renameFolder(id, title)
    setFolders((prev) =>
      prev
        .map((f) => (f.id === id ? { ...f, title, updatedAt: new Date() } : f))
        .sort((a, b) => a.title.localeCompare(b.title))
    )
  }, [])

  // delete a folder and everything inside it, then handle the "what do we show next?" problem
  const removeFolder = useCallback(async (id: number) => {
    // collect all folder IDs in the subtree (handles nested folders)
    const folderIds = new Set<number>()
    const queue = [id]
    while (queue.length > 0) {
      const current = queue.shift()!
      folderIds.add(current)
      for (const f of folders) {
        if (f.parentFolder === current) queue.push(f.id)
      }
    }

    // check if the active note is inside a folder we're about to delete
    const activeWasInDeletedFolder =
      noteIdRef.current !== null &&
      notes.some((n) => n.id === noteIdRef.current && n.folderId !== null && folderIds.has(n.folderId))

    if (activeWasInDeletedFolder && timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    await softDeleteFolder(id)

    const remainingNotes = notes.filter((n) => n.folderId === null || !folderIds.has(n.folderId))
    setNotes(remainingNotes)
    setFolders((prev) => prev.filter((f) => !folderIds.has(f.id)))

    // if the active note got caught in the cascade, switch to something else
    if (activeWasInDeletedFolder) {
      if (remainingNotes.length > 0) {
        const next = await getNoteById(remainingNotes[0].id)
        if (next) {
          skipNextSave.current = true
          setNoteId(next.id)
          setMarkdownState(next.body)
        }
      } else {
        const fresh = await createDefaultNote()
        skipNextSave.current = true
        setNoteId(fresh.id)
        setMarkdownState(fresh.body)
        setNotes([{ id: fresh.id, title: fresh.title, updatedAt: fresh.updatedAt, folderId: fresh.folderId }])
      }
    }
  }, [notes, folders])

  // move a note into a different folder (or to root with null)
  const moveNote = useCallback(async (targetNoteId: number, targetFolderId: number | null) => {
    await moveNoteToFolder(targetNoteId, targetFolderId)
    setNotes((prev) =>
      prev.map((n) => (n.id === targetNoteId ? { ...n, folderId: targetFolderId, updatedAt: new Date() } : n))
    )
  }, [])

  return {
    markdown, setMarkdown, isLoading,
    notes, noteId, selectNote, createNote, deleteNote,
    folders, addFolder, editFolderName, removeFolder, moveNote,
  }
}
