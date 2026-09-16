import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { env } from "../config/env";
import { logger } from "../lib/logger";

const REGION = env.S3_REGION;

export class ImageService {
  private static instance: ImageService;
  private s3Client: S3Client;

  private constructor() {
    this.s3Client = new S3Client({
      region: REGION,
      credentials:
        env.S3_ACCESS_KEY && env.S3_SECRET_KEY
          ? {
              accessKeyId: env.S3_ACCESS_KEY,
              secretAccessKey: env.S3_SECRET_KEY,
            }
          : undefined,
    });
  }

  static getInstance() {
    if (!ImageService.instance) {
      ImageService.instance = new ImageService();
    }
    return ImageService.instance;
  }

  async uploadImage(buffer: Buffer, filename: string, metadata?: Record<string, string>) {
    if (!env.BUCKET_NAME) {
      throw new Error("S3 bucket is not configured");
    }

    const optimizedBuffer = await sharp(buffer)
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer();

    const key = `images/${Date.now()}-${filename}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: key,
        Body: optimizedBuffer,
        ContentType: "image/jpeg",
        Metadata: metadata,
      })
    );

    return this.buildPublicUrl(key);
  }

  async generateThumbnail(buffer: Buffer, filename: string) {
    if (!env.BUCKET_NAME) {
      throw new Error("S3 bucket is not configured");
    }

    const thumbnailBuffer = await sharp(buffer)
      .resize(300, 300, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();

    const key = `thumbnails/${Date.now()}-${filename}`;

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: env.BUCKET_NAME,
        Key: key,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
      })
    );

    return this.buildPublicUrl(key);
  }

  async getSignedImageUrl(key: string, expiresIn = 3600) {
    if (!env.BUCKET_NAME) {
      throw new Error("S3 bucket is not configured");
    }

    const command = new GetObjectCommand({
      Bucket: env.BUCKET_NAME,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  private buildPublicUrl(key: string) {
    if (env.STORAGE_PUBLIC_URL) {
      return `https://${env.STORAGE_PUBLIC_URL}/${key}`;
    }

    return `https://${env.BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
  }
}

