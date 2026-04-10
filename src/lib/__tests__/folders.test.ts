import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db";
import {
  createFolder,
  getAllFolders,
  renameFolder,
  softDeleteFolder,
  getDeletedFolders,
  restoreFolder,
  hardDeleteFolder,
} from "../folders";
import { createDefaultNote, getNoteById } from "../notes";

beforeEach(async () => {
  await db.notes.clear();
  await db.folders.clear();
});

describe("createFolder", () => {
  it("creates a top-level folder with correct defaults", async () => {
    const folder = await createFolder("Notes");

    expect(folder.id).toBeDefined();
    expect(folder.title).toBe("Notes");
    expect(folder.parentFolder).toBeNull();
    expect(folder.deletedAt).toBeNull();
    expect(folder.createdAt).toBeInstanceOf(Date);
    expect(folder.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a nested folder with parentId", async () => {
    const parent = await createFolder("Parent");
    const child = await createFolder("Child", parent.id);

    expect(child.parentFolder).toBe(parent.id);
  });
});

describe("getAllFolders", () => {
  it("returns only non-deleted folders sorted alphabetically", async () => {
    await createFolder("Zebra");
    await createFolder("Alpha");
    await createFolder("Middle");

    const deleted = await createFolder("Gone");
    await softDeleteFolder(deleted.id);

    const all = await getAllFolders();

    expect(all).toHaveLength(3);
    expect(all[0].title).toBe("Alpha");
    expect(all[1].title).toBe("Middle");
    expect(all[2].title).toBe("Zebra");
  });
});

describe("renameFolder", () => {
  it("updates title and bumps updatedAt", async () => {
    const folder = await createFolder("Old Name");
    const originalUpdatedAt = folder.updatedAt;

    await renameFolder(folder.id, "New Name");
    const updated = await db.folders.get(folder.id);

    expect(updated!.title).toBe("New Name");
    expect(updated!.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
  });
});

describe("softDeleteFolder", () => {
  it("cascade-deletes the entire subtree", async () => {
    // build a tree: parent → child, with notes in both
    const parent = await createFolder("Parent");
    const child = await createFolder("Child", parent.id);

    const noteInParent = await createDefaultNote(parent.id);
    const noteInChild = await createDefaultNote(child.id);

    // also create a root-level note that should NOT be affected
    const rootNote = await createDefaultNote();

    await softDeleteFolder(parent.id);

    // both folders should be soft-deleted
    const parentAfter = await db.folders.get(parent.id);
    const childAfter = await db.folders.get(child.id);
    expect(parentAfter!.deletedAt).toBeInstanceOf(Date);
    expect(childAfter!.deletedAt).toBeInstanceOf(Date);

    // notes inside the tree should be soft-deleted
    const noteInParentAfter = await db.notes.get(noteInParent.id);
    const noteInChildAfter = await db.notes.get(noteInChild.id);
    expect(noteInParentAfter!.deletedAt).toBeInstanceOf(Date);
    expect(noteInChildAfter!.deletedAt).toBeInstanceOf(Date);

    // root-level note should be untouched
    const rootNoteAfter = await db.notes.get(rootNote.id);
    expect(rootNoteAfter!.deletedAt).toBeNull();

    // getAllFolders should return nothing
    const allFolders = await getAllFolders();
    expect(allFolders).toHaveLength(0);
  });
});

describe("getDeletedFolders", () => {
  it("returns only deleted folders", async () => {
    await createFolder("Active");
    const deleted = await createFolder("Deleted");
    await softDeleteFolder(deleted.id);

    const result = await getDeletedFolders();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(deleted.id);
  });
});

describe("restoreFolder", () => {
  it("cascade-restores the folder, child folders, and notes", async () => {
    const parent = await createFolder("Parent");
    const child = await createFolder("Child", parent.id);
    const noteInParent = await createDefaultNote(parent.id);
    const noteInChild = await createDefaultNote(child.id);

    await softDeleteFolder(parent.id);
    await restoreFolder(parent.id);

    // folders should be restored
    const parentAfter = await db.folders.get(parent.id);
    const childAfter = await db.folders.get(child.id);
    expect(parentAfter!.deletedAt).toBeNull();
    expect(childAfter!.deletedAt).toBeNull();

    // notes should be restored
    const noteInParentAfter = await getNoteById(noteInParent.id);
    const noteInChildAfter = await getNoteById(noteInChild.id);
    expect(noteInParentAfter!.deletedAt).toBeNull();
    expect(noteInChildAfter!.deletedAt).toBeNull();
  });

  it("moves to top level if parent folder is still deleted", async () => {
    const grandparent = await createFolder("Grandparent");
    const parent = await createFolder("Parent", grandparent.id);

    await softDeleteFolder(grandparent.id);

    // restore only the child, not the grandparent
    await restoreFolder(parent.id);

    const parentAfter = await db.folders.get(parent.id);
    expect(parentAfter!.deletedAt).toBeNull();
    expect(parentAfter!.parentFolder).toBeNull();
  });
});

describe("hardDeleteFolder", () => {
  it("permanently removes folder and all children", async () => {
    const parent = await createFolder("Parent");
    const child = await createFolder("Child", parent.id);
    const noteInParent = await createDefaultNote(parent.id);
    const noteInChild = await createDefaultNote(child.id);

    // also create a root note that should NOT be affected
    const rootNote = await createDefaultNote();

    await hardDeleteFolder(parent.id);

    // folders should be gone
    expect(await db.folders.get(parent.id)).toBeUndefined();
    expect(await db.folders.get(child.id)).toBeUndefined();

    // notes inside should be gone
    expect(await getNoteById(noteInParent.id)).toBeUndefined();
    expect(await getNoteById(noteInChild.id)).toBeUndefined();

    // root note should be untouched
    expect(await getNoteById(rootNote.id)).toBeDefined();
  });
});
