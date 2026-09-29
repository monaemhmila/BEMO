import {
  isPrivateOrReservedIp,
  isPrivateOrReservedIpv4,
  isPrivateOrReservedIpv6,
  isAllowedHostname,
  checkImageMagicBytes,
  validateImageBuffer,
  MAX_IMAGE_DOWNLOAD_BYTES,
} from "./safe-image-fetcher";
import sharp from "sharp";

async function runTests() {
  console.log("--- Starting SSRF & Image Validation Tests ---\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Hostname allowlist tests
  assert(isAllowedHostname("fal.media"), "Allows exact fal.media");
  assert(isAllowedHostname("v3.fal.media"), "Allows subdomain v3.fal.media");
  assert(isAllowedHostname("queue.fal.ai"), "Allows subdomain queue.fal.ai");
  assert(isAllowedHostname("s3.amazonaws.com"), "Allows s3.amazonaws.com");
  assert(isAllowedHostname("mybucket.s3.amazonaws.com"), "Allows *.s3.amazonaws.com");
  assert(!isAllowedHostname("evil-fal.media"), "Rejects prefix lookalike evil-fal.media");
  assert(!isAllowedHostname("fal.media.attacker.com"), "Rejects suffix lookalike fal.media.attacker.com");
  assert(!isAllowedHostname("localhost"), "Rejects localhost");
  assert(!isAllowedHostname("169.254.169.254"), "Rejects raw IP hostname");
  assert(!isAllowedHostname("google.com"), "Rejects arbitrary non-allowlisted domain");

  // 2. IPv4 Range checks
  assert(isPrivateOrReservedIpv4("127.0.0.1"), "Blocks IPv4 loopback 127.0.0.1");
  assert(isPrivateOrReservedIpv4("127.255.255.254"), "Blocks IPv4 loopback 127.255.255.254");
  assert(isPrivateOrReservedIpv4("10.0.0.5"), "Blocks RFC 1918 10.0.0.5");
  assert(isPrivateOrReservedIpv4("172.16.1.1"), "Blocks RFC 1918 172.16.1.1");
  assert(isPrivateOrReservedIpv4("172.31.255.255"), "Blocks RFC 1918 172.31.255.255");
  assert(isPrivateOrReservedIpv4("192.168.1.1"), "Blocks RFC 1918 192.168.1.1");
  assert(isPrivateOrReservedIpv4("169.254.169.254"), "Blocks Cloud Metadata 169.254.169.254");
  assert(isPrivateOrReservedIpv4("169.254.1.1"), "Blocks Link-Local 169.254.1.1");
  assert(isPrivateOrReservedIpv4("100.64.0.1"), "Blocks Carrier Grade NAT 100.64.0.1");
  assert(isPrivateOrReservedIpv4("0.0.0.0"), "Blocks 0.0.0.0");
  assert(isPrivateOrReservedIpv4("224.0.0.1"), "Blocks Multicast 224.0.0.1");
  assert(isPrivateOrReservedIpv4("255.255.255.255"), "Blocks Broadcast 255.255.255.255");
  assert(!isPrivateOrReservedIpv4("8.8.8.8"), "Allows public IPv4 8.8.8.8");
  assert(!isPrivateOrReservedIpv4("1.1.1.1"), "Allows public IPv4 1.1.1.1");

  // 3. IPv6 Range checks
  assert(isPrivateOrReservedIpv6("::1"), "Blocks IPv6 loopback ::1");
  assert(isPrivateOrReservedIpv6("::"), "Blocks IPv6 unspecified ::");
  assert(isPrivateOrReservedIpv6("fc00::1"), "Blocks Unique Local Address fc00::1");
  assert(isPrivateOrReservedIpv6("fd12:3456:789a::1"), "Blocks Unique Local Address fd12::1");
  assert(isPrivateOrReservedIpv6("fe80::1"), "Blocks IPv6 Link-Local fe80::1");
  assert(isPrivateOrReservedIpv6("ff02::1"), "Blocks IPv6 Multicast ff02::1");
  assert(isPrivateOrReservedIpv6("fd00:ec2::254"), "Blocks AWS IMDSv6 fd00:ec2::254");
  assert(isPrivateOrReservedIpv6("::ffff:127.0.0.1"), "Blocks IPv4-mapped IPv6 ::ffff:127.0.0.1");
  assert(isPrivateOrReservedIpv6("::ffff:169.254.169.254"), "Blocks IPv4-mapped metadata ::ffff:169.254.169.254");

  // 4. Combined isPrivateOrReservedIp
  assert(isPrivateOrReservedIp("127.0.0.1"), "isPrivateOrReservedIp blocks 127.0.0.1");
  assert(isPrivateOrReservedIp("::1"), "isPrivateOrReservedIp blocks ::1");
  assert(isPrivateOrReservedIp("not-an-ip"), "isPrivateOrReservedIp blocks invalid IP");
  assert(!isPrivateOrReservedIp("93.184.216.34"), "isPrivateOrReservedIp allows public IP");

  // 5. Magic bytes & Image content checks
  const fakeHtml = Buffer.from("<html><body><script>alert(1)</script></body></html>");
  assert(checkImageMagicBytes(fakeHtml) === null, "Rejects HTML magic bytes");

  const fakeSvg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><circle/></svg>");
  assert(checkImageMagicBytes(fakeSvg) === null, "Rejects SVG magic bytes");

  // Valid JPEG image buffer
  const validJpeg = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();

  assert(checkImageMagicBytes(validJpeg) === "jpeg", "Identifies JPEG magic bytes");
  const validatedJpeg = await validateImageBuffer(validJpeg);
  assert(validatedJpeg.format === "jpeg", "Validates JPEG format");
  assert(validatedJpeg.extension === "jpg", "Returns canonical jpg extension");
  assert(validatedJpeg.width === 100 && validatedJpeg.height === 100, "Validates image dimensions");

  // Valid PNG image buffer
  const validPng = await sharp({
    create: {
      width: 50,
      height: 50,
      channels: 4,
      background: { r: 0, g: 255, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

  assert(checkImageMagicBytes(validPng) === "png", "Identifies PNG magic bytes");
  const validatedPng = await validateImageBuffer(validPng);
  assert(validatedPng.format === "png", "Validates PNG format");
  assert(validatedPng.extension === "png", "Returns canonical png extension");

  // Test decompression bomb / oversized image rejection
  let caughtBomb = false;
  try {
    const hugeBuffer = Buffer.alloc(MAX_IMAGE_DOWNLOAD_BYTES + 100);
    await validateImageBuffer(hugeBuffer);
  } catch (err) {
    caughtBomb = true;
  }
  assert(caughtBomb, "Rejects payload exceeding maximum byte size");

  console.log(`\n--- Test Results: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
