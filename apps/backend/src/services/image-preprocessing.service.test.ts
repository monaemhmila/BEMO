import sharp from "sharp";
import { preprocessImageForGrokEdit } from "./image-preprocessing.service";

async function runTests() {
  console.log("--- START PREPROCESSING TESTS ---");

  // Test 1: Low resolution image (300x600) -> should be rejected (< 512px short side)
  try {
    const lowResBuf = await sharp({
      create: { width: 300, height: 600, channels: 3, background: { r: 255, g: 0, b: 0 } }
    }).jpeg().toBuffer();

    await preprocessImageForGrokEdit(lowResBuf);
    console.error("FAIL: Low res image was NOT rejected!");
  } catch (err: any) {
    console.log("PASS: Low res image rejected correctly ->", err.message);
  }

  // Test 2: Extreme wide aspect ratio (4:1 -> 2400x600) -> should be rejected (> 3:1)
  try {
    const wideBuf = await sharp({
      create: { width: 2400, height: 600, channels: 3, background: { r: 0, g: 255, b: 0 } }
    }).jpeg().toBuffer();

    await preprocessImageForGrokEdit(wideBuf);
    console.error("FAIL: Extreme wide image was NOT rejected!");
  } catch (err: any) {
    console.log("PASS: Extreme wide image rejected correctly ->", err.message);
  }

  // Test 3: Extreme tall aspect ratio (1:4 -> 600x2400) -> should be rejected (< 1:3)
  try {
    const tallBuf = await sharp({
      create: { width: 600, height: 2400, channels: 3, background: { r: 0, g: 0, b: 255 } }
    }).jpeg().toBuffer();

    await preprocessImageForGrokEdit(tallBuf);
    console.error("FAIL: Extreme tall image was NOT rejected!");
  } catch (err: any) {
    console.log("PASS: Extreme tall image rejected correctly ->", err.message);
  }

  // Test 4: Valid portrait image (1000x1500) -> should output 1920x1080 JPEG
  try {
    const portraitBuf = await sharp({
      create: { width: 1000, height: 1500, channels: 3, background: { r: 120, g: 120, b: 120 } }
    }).jpeg().toBuffer();

    const result = await preprocessImageForGrokEdit(portraitBuf);
    const meta = await sharp(result.buffer).metadata();
    console.log(`PASS: Valid portrait processed -> dimensions: ${meta.width}x${meta.height}, format: ${meta.format}, buffer size: ${result.buffer.length} bytes`);
  } catch (err: any) {
    console.error("FAIL: Valid portrait failed ->", err.message);
  }

  // Test 5: Valid square image (1200x1200) -> should output 1920x1080 JPEG
  try {
    const squareBuf = await sharp({
      create: { width: 1200, height: 1200, channels: 3, background: { r: 200, g: 100, b: 50 } }
    }).jpeg().toBuffer();

    const result = await preprocessImageForGrokEdit(squareBuf);
    const meta = await sharp(result.buffer).metadata();
    console.log(`PASS: Valid square processed -> dimensions: ${meta.width}x${meta.height}, format: ${meta.format}, buffer size: ${result.buffer.length} bytes`);
  } catch (err: any) {
    console.error("FAIL: Valid square failed ->", err.message);
  }

  // Test 6: Valid landscape image (2400x1600) -> should output 1920x1080 JPEG
  try {
    const landscapeBuf = await sharp({
      create: { width: 2400, height: 1600, channels: 3, background: { r: 50, g: 150, b: 200 } }
    }).jpeg().toBuffer();

    const result = await preprocessImageForGrokEdit(landscapeBuf);
    const meta = await sharp(result.buffer).metadata();
    console.log(`PASS: Valid landscape processed -> dimensions: ${meta.width}x${meta.height}, format: ${meta.format}, buffer size: ${result.buffer.length} bytes`);
  } catch (err: any) {
    console.error("FAIL: Valid landscape failed ->", err.message);
  }

  console.log("--- END PREPROCESSING TESTS ---");
}

runTests();
