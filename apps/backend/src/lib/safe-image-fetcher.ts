import dns from "dns";
import net from "net";
import sharp, { type Metadata } from "sharp";
import { logger } from "./logger";
import { env } from "../config/env";

/** Maximum allowed downloaded image size in bytes (15 MB) */
export const MAX_IMAGE_DOWNLOAD_BYTES = 15 * 1024 * 1024;

/** Maximum allowed image dimensions in pixels to prevent decompression bombs */
export const MAX_IMAGE_DIMENSION = 8192;
export const MAX_IMAGE_PIXELS = 33554432; // 32 Megapixels

/** Timeout for remote image fetch in milliseconds */
// Fal story illustrations can be several megabytes; allow slow CDN responses
// enough time to finish instead of producing an incomplete PDF.
export const IMAGE_FETCH_TIMEOUT_MS = 120000;

/** Allowed raster image formats */
export const ALLOWED_IMAGE_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif"]);

/**
 * Built-in trusted domain patterns for image origins.
 * Suffixes starting with '.' match subdomains.
 */
const DEFAULT_TRUSTED_IMAGE_DOMAINS = [
  "fal.media",
  "fal.ai",
  "amazonaws.com",
  "cloudfront.net",
  "clerk.com",
  "clerk.dev",
  "openai.com",
  "blob.core.windows.net",
];

/**
 * Helper to get all configured trusted origins/domains from environment and defaults
 */
export function getTrustedImageDomains(): string[] {
  const domains = new Set<string>(DEFAULT_TRUSTED_IMAGE_DOMAINS);

  // Extract from STORAGE_PUBLIC_URL if present
  if (env.STORAGE_PUBLIC_URL) {
    try {
      const url = new URL(env.STORAGE_PUBLIC_URL);
      if (url.hostname) domains.add(url.hostname.toLowerCase());
    } catch {
      // ignore malformed env URL
    }
  }

  // Extract from S3_ENDPOINT if present
  if (env.S3_ENDPOINT) {
    try {
      const url = new URL(env.S3_ENDPOINT);
      if (url.hostname) domains.add(url.hostname.toLowerCase());
    } catch {
      // ignore
    }
  }

  // Extract from CLOUDFRONT_DOMAIN if present in process.env
  if (process.env.CLOUDFRONT_DOMAIN) {
    const cf = process.env.CLOUDFRONT_DOMAIN.trim().toLowerCase().replace(/^https?:\/\//, "");
    if (cf) domains.add(cf);
  }

  // Extract from custom ALLOWED_IMAGE_ORIGINS (comma-separated)
  if (process.env.ALLOWED_IMAGE_ORIGINS) {
    const custom = process.env.ALLOWED_IMAGE_ORIGINS.split(",");
    for (const d of custom) {
      const trimmed = d.trim().toLowerCase().replace(/^https?:\/\//, "");
      if (trimmed) domains.add(trimmed);
    }
  }

  return Array.from(domains);
}

/**
 * Checks if a hostname matches the trusted domains list.
 * Enforces strict boundary checks (exact match or subdomain match).
 */
export function isAllowedHostname(hostname: string, allowedDomains = getTrustedImageDomains()): boolean {
  const cleanHost = hostname.trim().toLowerCase();
  if (!cleanHost) return false;

  for (const domain of allowedDomains) {
    const cleanDomain = domain.trim().toLowerCase();
    if (cleanHost === cleanDomain) {
      return true;
    }
    if (cleanHost.endsWith("." + cleanDomain)) {
      return true;
    }
  }

  return false;
}

/**
 * Parses an IPv4 address string into a 32-bit unsigned number.
 */
function ipv4ToNumber(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let num = 0;
  for (let i = 0; i < 4; i++) {
    const part = parseInt(parts[i], 10);
    if (isNaN(part) || part < 0 || part > 255 || parts[i] !== part.toString()) {
      return null;
    }
    num = (num << 8) + part;
  }
  return num >>> 0;
}

/**
 * Converts a CIDR mask length (e.g. 8, 16, 24) to a 32-bit bitmask.
 */
function cidrMask(prefixLength: number): number {
  if (prefixLength === 0) return 0;
  return ((0xffffffff << (32 - prefixLength)) >>> 0);
}

/**
 * Checks if an IPv4 address is in a CIDR block.
 */
function isIpv4InCidr(ipNum: number, cidrBase: string, prefixLength: number): boolean {
  const baseNum = ipv4ToNumber(cidrBase);
  if (baseNum === null) return false;
  const mask = cidrMask(prefixLength);
  return (ipNum & mask) === (baseNum & mask);
}

/**
 * Comprehensive check for IPv4 private, loopback, link-local, reserved,
 * multicast, and metadata addresses.
 */
export function isPrivateOrReservedIpv4(ip: string): boolean {
  const ipNum = ipv4ToNumber(ip);
  if (ipNum === null) return true; // Invalid format treated as unsafe

  // 0.0.0.0/8 - "This network"
  if (isIpv4InCidr(ipNum, "0.0.0.0", 8)) return true;

  // 10.0.0.0/8 - Private RFC 1918
  if (isIpv4InCidr(ipNum, "10.0.0.0", 8)) return true;

  // 100.64.0.0/10 - Carrier-grade NAT RFC 6598
  if (isIpv4InCidr(ipNum, "100.64.0.0", 10)) return true;

  // 127.0.0.0/8 - Loopback
  if (isIpv4InCidr(ipNum, "127.0.0.0", 8)) return true;

  // 169.254.0.0/16 - Link-Local & Cloud Metadata (169.254.169.254)
  if (isIpv4InCidr(ipNum, "169.254.0.0", 16)) return true;

  // 172.16.0.0/12 - Private RFC 1918
  if (isIpv4InCidr(ipNum, "172.16.0.0", 12)) return true;

  // 192.0.0.0/24 - IETF Protocol Assignments
  if (isIpv4InCidr(ipNum, "192.0.0.0", 24)) return true;

  // 192.0.2.0/24 - Documentation (TEST-NET-1)
  if (isIpv4InCidr(ipNum, "192.0.2.0", 24)) return true;

  // 192.88.99.0/24 - 6to4 relay anycast
  if (isIpv4InCidr(ipNum, "192.88.99.0", 24)) return true;

  // 192.168.0.0/16 - Private RFC 1918
  if (isIpv4InCidr(ipNum, "192.168.0.0", 16)) return true;

  // 198.18.0.0/15 - Network benchmark testing
  if (isIpv4InCidr(ipNum, "198.18.0.0", 15)) return true;

  // 198.51.100.0/24 - Documentation (TEST-NET-2)
  if (isIpv4InCidr(ipNum, "198.51.100.0", 24)) return true;

  // 203.0.113.0/24 - Documentation (TEST-NET-3)
  if (isIpv4InCidr(ipNum, "203.0.113.0", 24)) return true;

  // 224.0.0.0/4 - Multicast
  if (isIpv4InCidr(ipNum, "224.0.0.0", 4)) return true;

  // 240.0.0.0/4 - Reserved (former Class E)
  if (isIpv4InCidr(ipNum, "240.0.0.0", 4)) return true;

  // 255.255.255.255/32 - Limited Broadcast
  if (ipNum === 0xffffffff) return true;

  return false;
}

/**
 * Checks for IPv6 private, loopback, link-local, multicast, documentation,
 * unique-local (ULA), IPv4-mapped, and cloud metadata addresses.
 */
export function isPrivateOrReservedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase().trim();

  // :: or ::0 (Unspecified)
  if (normalized === "::" || normalized === "::0" || normalized === "0:0:0:0:0:0:0:0") {
    return true;
  }

  // ::1 (Loopback)
  if (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1") {
    return true;
  }

  // IPv4-mapped IPv6: ::ffff:a.b.c.d or ::ffff:x:y
  if (normalized.startsWith("::ffff:")) {
    const rest = normalized.slice(7);
    if (net.isIPv4(rest)) {
      return isPrivateOrReservedIpv4(rest);
    }
  }

  // Unique Local Address (ULA) - fc00::/7 (fc00:: - fdff::)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }

  // Link-Local - fe80::/10 (fe80:: - febf::)
  if (/^fe[89ab]/i.test(normalized)) {
    return true;
  }

  // Multicast - ff00::/8
  if (normalized.startsWith("ff")) {
    return true;
  }

  // Documentation - 2001:db8::/32
  if (normalized.startsWith("2001:db8:") || normalized === "2001:db8::") {
    return true;
  }

  // Discard prefix - 100::/64
  if (normalized.startsWith("100::")) {
    return true;
  }

  // AWS IMDSv6 endpoint fd00:ec2::254
  if (normalized.includes("fd00:ec2:")) {
    return true;
  }

  return false;
}

/**
 * Evaluates whether an IP address (IPv4 or IPv6) is private or reserved.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    return isPrivateOrReservedIpv4(ip);
  }
  if (version === 6) {
    return isPrivateOrReservedIpv6(ip);
  }
  return true; // Not a valid IP address -> reject
}

/**
 * Resolves a hostname via DNS and checks all returned IP addresses.
 * Rejects if any resolved IP belongs to a private/loopback/cloud-metadata range.
 */
export async function resolveAndValidateHost(hostname: string): Promise<string[]> {
  // If the hostname is already an IP address, validate it directly
  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error(`SSRF blocked: Hostname is a private/reserved IP (${hostname})`);
    }
    return [hostname];
  }

  let addresses: dns.LookupAddress[];
  try {
    addresses = await dns.promises.lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    throw new Error(`DNS resolution failed for hostname "${hostname}": ${(error as Error).message}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`DNS resolution returned no records for hostname "${hostname}"`);
  }

  for (const record of addresses) {
    if (isPrivateOrReservedIp(record.address)) {
      logger.warn(
        { hostname, ip: record.address },
        "SSRF blocked: Host resolved to a private/reserved IP address"
      );
      throw new Error(`SSRF blocked: Host "${hostname}" resolved to prohibited IP ${record.address}`);
    }
  }

  return addresses.map((a) => a.address);
}

/**
 * Validates a remote image URL against SSRF rules:
 * 1. Protocol must be HTTPS
 * 2. No userinfo (username/password in URL)
 * 3. Port must be standard HTTPS (443 or default)
 * 4. Hostname must match the trusted domains allowlist
 * 5. DNS resolution must not resolve to any private/internal/cloud metadata IP
 */
export async function validateImageUrlForSsrf(rawUrl: string): Promise<URL> {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Invalid URL: URL string is required");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error(`Invalid URL: Could not parse "${rawUrl}"`);
  }

  // 1. Strict HTTPS protocol requirement
  if (parsedUrl.protocol !== "https:") {
    throw new Error(`SSRF blocked: Only HTTPS protocol is allowed (received ${parsedUrl.protocol})`);
  }

  // 2. Reject userinfo
  if (parsedUrl.username || parsedUrl.password) {
    throw new Error("SSRF blocked: Userinfo in URL is not permitted");
  }

  // 3. Port validation (must be standard 443 or empty)
  if (parsedUrl.port && parsedUrl.port !== "443") {
    throw new Error(`SSRF blocked: Non-standard port "${parsedUrl.port}" is not permitted`);
  }

  // 4. Hostname allowlist check
  const hostname = parsedUrl.hostname;
  if (!isAllowedHostname(hostname)) {
    throw new Error(`SSRF blocked: Hostname "${hostname}" is not in the trusted image domains allowlist`);
  }

  // 5. DNS resolution & IP check
  await resolveAndValidateHost(hostname);

  return parsedUrl;
}

/**
 * Inspect magic bytes of a buffer to verify that it is a known raster image format.
 */
export function checkImageMagicBytes(buffer: Buffer): string | null {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "png";
  }

  // WEBP: RIFF....WEBP (bytes 0-3: 52 49 46 46, bytes 8-11: 57 45 42 50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return "webp";
  }

  // GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return "gif";
  }

  // AVIF: ....ftypavif or ....ftypavis
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buffer.subarray(8, 12).toString("ascii");
    if (brand === "avif" || brand === "avis") {
      return "avif";
    }
  }

  return null;
}

export interface ValidatedImage {
  buffer: Buffer;
  format: "jpeg" | "png" | "webp" | "gif" | "avif";
  extension: "jpg" | "png" | "webp" | "gif" | "avif";
  width: number;
  height: number;
  sizeBytes: number;
}

/**
 * Validates an image buffer using magic bytes and Sharp metadata.
 * Enforces format allowlist and dimension/pixel limits to prevent decompression bombs.
 */
export async function validateImageBuffer(buffer: Buffer): Promise<ValidatedImage> {
  if (!buffer || buffer.length === 0) {
    throw new Error("Image buffer is empty");
  }

  if (buffer.length > MAX_IMAGE_DOWNLOAD_BYTES) {
    throw new Error(
      `Image size (${(buffer.length / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed limit (${
        MAX_IMAGE_DOWNLOAD_BYTES / 1024 / 1024
      } MB)`
    );
  }

  // 1. Magic bytes check
  const magicFormat = checkImageMagicBytes(buffer);
  if (!magicFormat) {
    throw new Error("Invalid image: magic bytes do not match a supported raster image format");
  }

  // 2. Decode metadata with Sharp
  let metadata: Metadata;
  try {
    const sharpInstance = sharp(buffer, {
      failOn: "error",
      limitInputPixels: MAX_IMAGE_PIXELS,
    });
    metadata = await sharpInstance.metadata();
  } catch (error) {
    throw new Error(`Failed to decode image metadata: ${(error as Error).message}`);
  }

  const detectedFormat = metadata.format?.toLowerCase();
  if (!detectedFormat || !ALLOWED_IMAGE_FORMATS.has(detectedFormat)) {
    throw new Error(`Unsupported image format: "${detectedFormat}" (only jpeg, png, webp, gif, avif allowed)`);
  }

  if (!metadata.width || !metadata.height) {
    throw new Error("Invalid image: dimensions could not be read");
  }

  if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
    throw new Error(
      `Image dimensions (${metadata.width}x${metadata.height}) exceed maximum allowed limit (${MAX_IMAGE_DIMENSION}px)`
    );
  }

  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new Error(
      `Image total pixels (${metadata.width * metadata.height}) exceed maximum allowed limit (${MAX_IMAGE_PIXELS})`
    );
  }

  const format = detectedFormat as "jpeg" | "png" | "webp" | "gif" | "avif";
  const extension = format === "jpeg" ? "jpg" : format;

  return {
    buffer,
    format,
    extension,
    width: metadata.width,
    height: metadata.height,
    sizeBytes: buffer.length,
  };
}

/**
 * Downloads a remote image securely:
 * - Validates URL against SSRF rules (HTTPS only, domain allowlist, private IP rejection)
 * - Disables redirects to prevent redirect-based SSRF/DNS rebinding
 * - Sets a strict timeout
 * - Streams the response with a hard size limit
 * - Validates magic bytes and image metadata with Sharp
 */
export async function safeFetchAndValidateImage(rawUrl: string): Promise<ValidatedImage> {
  const validatedUrl = await validateImageUrlForSsrf(rawUrl);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), IMAGE_FETCH_TIMEOUT_MS);

  try {
    // Disable redirects to prevent redirect-based SSRF bypasses
    const response = await fetch(validatedUrl.toString(), {
      signal: controller.signal,
      redirect: "error",
      headers: {
        Accept: "image/jpeg,image/png,image/webp,image/gif,image/avif,application/octet-stream;q=0.9",
        "User-Agent": "BemoSecurityClient/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Remote image fetch failed with HTTP ${response.status} ${response.statusText}`);
    }

    // Check Content-Length header if provided
    const contentLengthHeader = response.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = parseInt(contentLengthHeader, 10);
      if (!isNaN(contentLength) && contentLength > MAX_IMAGE_DOWNLOAD_BYTES) {
        throw new Error(
          `Image Content-Length (${(contentLength / 1024 / 1024).toFixed(2)} MB) exceeds limit (${
            MAX_IMAGE_DOWNLOAD_BYTES / 1024 / 1024
          } MB)`
        );
      }
    }

    // Stream and buffer the response with byte counting to enforce max size
    if (!response.body) {
      throw new Error("Empty response body from remote image server");
    }

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > MAX_IMAGE_DOWNLOAD_BYTES) {
          controller.abort();
          throw new Error(
            `Download exceeded maximum allowed image size (${MAX_IMAGE_DOWNLOAD_BYTES / 1024 / 1024} MB)`
          );
        }
        chunks.push(value);
      }
    }

    const combinedBuffer = Buffer.concat(chunks.map((c) => Buffer.from(c)));

    // Validate the image content and dimensions
    return await validateImageBuffer(combinedBuffer);
  } finally {
    clearTimeout(timeoutId);
  }
}
