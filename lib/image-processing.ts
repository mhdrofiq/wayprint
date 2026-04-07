import sharp from 'sharp';

export interface ProcessedImage {
  full: Buffer;
  thumb: Buffer;
}

/**
 * Resize and compress an image into two WebP variants.
 * Strips all EXIF metadata from both outputs.
 *
 * full  — max 2000px on the long edge, WebP quality 80
 * thumb — max 800px on the long edge, WebP quality 75
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const base = sharp(input).rotate(); // .rotate() auto-corrects EXIF orientation

  const [full, thumb] = await Promise.all([
    base
      .clone()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      // metadata stripped by default (no .withMetadata() call)
      .toBuffer(),
    base
      .clone()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      // metadata stripped by default (no .withMetadata() call)
      .toBuffer(),
  ]);

  return { full, thumb };
}
