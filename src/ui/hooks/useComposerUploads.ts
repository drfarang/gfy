import { useCallback, useEffect, type RefObject } from "react";
import type { TextareaRenderable } from "@opentui/core";
import { unlink } from "node:fs/promises";
import {
  clipboardImageToTempFile,
  parseDroppedImagePath,
  uploadImageFile,
  type UploadTarget,
} from "../../util/upload";
import { errMsg } from "../hooks";

interface ComposerUploadOptions {
  bodyRef: RefObject<TextareaRenderable | null>;
  upload?: UploadTarget;
  onStatus: (status: string) => void;
}

type UploadAndInsert = (localPath: string, cleanup?: boolean) => Promise<void>;

/** Upload a local image and insert its BBCode at the current textarea cursor. */
export function useUploadAndInsert({ bodyRef, upload, onStatus }: ComposerUploadOptions): UploadAndInsert {
  return useCallback(
    async (localPath: string, cleanup = false) => {
      if (!upload?.host) {
        onStatus("Image upload is not configured.");
        return;
      }
      onStatus("Uploading image...");
      try {
        const url = await uploadImageFile(localPath, upload);
        bodyRef.current?.insertText(`[IMG]${url}[/IMG]`);
        onStatus("Image uploaded.");
      } catch (error) {
        onStatus("Upload failed: " + errMsg(error));
      } finally {
        if (cleanup) unlink(localPath).catch(() => {});
      }
    },
    [bodyRef, onStatus, upload],
  );
}

/** Turn a pasted local image path into an upload instead of textarea text. */
export function useDroppedImageUpload(
  { bodyRef, upload }: Pick<ComposerUploadOptions, "bodyRef" | "upload">,
  uploadAndInsert: UploadAndInsert,
): void {
  useEffect(() => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    textarea.onPaste = (event) => {
      const path = parseDroppedImagePath(new TextDecoder().decode(event.bytes));
      if (path && upload?.host) {
        event.preventDefault();
        void uploadAndInsert(path);
      }
    };
    return () => {
      textarea.onPaste = undefined;
    };
  }, [bodyRef, upload, uploadAndInsert]);
}

/** Read a clipboard image into a temporary file and upload it. */
export function useClipboardImageUpload(
  { upload, onStatus }: Pick<ComposerUploadOptions, "upload" | "onStatus">,
  uploadAndInsert: UploadAndInsert,
): () => Promise<void> {
  return useCallback(async () => {
    if (!upload?.host) {
      onStatus("Image upload is not configured.");
      return;
    }
    onStatus("Reading clipboard...");
    const temporaryPath = await clipboardImageToTempFile();
    if (!temporaryPath) {
      onStatus("No image on the clipboard.");
      return;
    }
    await uploadAndInsert(temporaryPath, true);
  }, [onStatus, upload, uploadAndInsert]);
}

export function useComposerUploads(options: ComposerUploadOptions) {
  const uploadAndInsert = useUploadAndInsert(options);
  useDroppedImageUpload(options, uploadAndInsert);
  const pasteClipboardImage = useClipboardImageUpload(options, uploadAndInsert);
  return { pasteClipboardImage };
}
