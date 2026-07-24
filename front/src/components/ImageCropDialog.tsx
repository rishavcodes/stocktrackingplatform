"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  type Crop,
  type PixelCrop,
  type PercentCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  /** Object URL / data URL of the picked image. Empty string = closed. */
  src: string;
  /** Filename to give the cropped output. */
  fileName?: string;
  /** Mime type for the cropped output (falls back to PNG). */
  mimeType?: string;
  onCancel: () => void;
  onCropped: (file: File, previewUrl: string) => void;
};

// The whole image is selected by default so nothing is cropped out unless the
// user actively resizes the box — matches "don't cut the image".
const FULL_CROP: Crop = { unit: "%", x: 0, y: 0, width: 100, height: 100 };

export default function ImageCropDialog({
  src,
  fileName = "avatar.png",
  mimeType,
  onCancel,
  onCropped,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>(FULL_CROP);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [saving, setSaving] = useState(false);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    // Reset to a full-image selection every time a new image loads.
    setCrop(FULL_CROP);
    setCompletedCrop({
      unit: "px",
      x: 0,
      y: 0,
      width: img.width,
      height: img.height,
    });
  }

  async function handleApply() {
    const image = imgRef.current;
    if (!image) return;
    setSaving(true);

    try {
      // Map the on-screen crop (CSS px) back to the image's natural pixels so
      // the output keeps full resolution and isn't downscaled.
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const c = completedCrop;
      const sx = (c?.x ?? 0) * scaleX;
      const sy = (c?.y ?? 0) * scaleY;
      const sw = (c?.width ?? image.width) * scaleX;
      const sh = (c?.height ?? image.height) * scaleY;

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setSaving(false);
        return;
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      // JPEGs can't carry transparency — only honour PNG, else default to PNG.
      const outType = mimeType === "image/jpeg" ? "image/jpeg" : "image/png";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setSaving(false);
            return;
          }
          const ext = outType === "image/jpeg" ? "jpg" : "png";
          const safeName = fileName.replace(/\.[^.]+$/, "") || "avatar";
          const file = new File([blob], `${safeName}.${ext}`, {
            type: outType,
          });
          onCropped(file, URL.createObjectURL(blob));
          setSaving(false);
        },
        outType,
        0.92
      );
    } catch {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={!!src}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="max-w-lg p-4">
        <DialogHeader>
          <DialogTitle>Crop photo</DialogTitle>
          <DialogDescription>
            The full image is selected by default — nothing is cut unless you
            drag the handles to resize the crop area.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center bg-gray-50 dark:bg-gray-800/40 rounded-lg p-2 max-h-[60vh] overflow-auto">
          {src && (
            <ReactCrop
              crop={crop}
              onChange={(_px: PixelCrop, percent: PercentCrop) =>
                setCrop(percent)
              }
              onComplete={(px: PixelCrop) => setCompletedCrop(px)}
              keepSelection
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={src}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{ maxHeight: "55vh", width: "auto" }}
              />
            </ReactCrop>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleApply} disabled={saving}>
            {saving ? "Applying…" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
