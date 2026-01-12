/**
 * @file WebP sticker conversion utility using Bun native APIs
 * @module lib/sticker
 * @description Converts images and videos to WhatsApp sticker format (WebP) with EXIF metadata.
 * Uses Bun's native APIs and FFmpeg CLI for efficient, memory-safe processing without filesystem operations.
 * @license Apache-2.0
 * @author Naruya Izumi
 */

import webp from "node-webpmux";

/**
 * Converts image to WebP format using FFmpeg (pure in-memory)
 * @async
 * @function imageToWebp
 * @param {Buffer} buffer - Image buffer
 * @param {Object} [options={}] - Conversion options
 * @param {number} [options.quality=90] - WebP quality (1-100)
 * @returns {Promise<Buffer>} WebP image buffer
 * 
 * @throws {Error} If FFmpeg conversion fails
 * 
 * @conversionProcess
 * 1. Spawn FFmpeg with stdin/stdout pipes
 * 2. Write buffer to stdin
 * 3. Apply WebP codec with scaling (320x320)
 * 4. Read output from stdout
 * 5. Automatic memory cleanup
 * 
 * @example
 * const imageBuffer = await fetch('image.png').then(r => r.arrayBuffer());
 * const webpBuffer = await imageToWebp(Buffer.from(imageBuffer), { quality: 85 });
 */
export async function imageToWebp(buffer, options = {}) {
	const { quality = 90 } = options;

	const proc = Bun.spawn([
		'ffmpeg',
		'-i', 'pipe:0', // Read from stdin
		'-vcodec', 'libwebp',
		'-vf', `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,pad=320:320:-1:-1:color=white@0.0`,
		'-q:v', quality.toString(),
		'-f', 'webp',
		'pipe:1' // Write to stdout
	], {
		stdin: 'pipe',
		stdout: 'pipe',
		stderr: 'pipe',
	});

	// Write input buffer to stdin
	proc.stdin.write(buffer);
	proc.stdin.end();

	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		const stderr = await new Response(proc.stderr).text();
		throw new Error(`FFmpeg image conversion failed: ${stderr}`);
	}

	// Read output from stdout
	const output = await new Response(proc.stdout).arrayBuffer();
	return Buffer.from(output);
}

/**
 * Converts video to animated WebP sticker using FFmpeg (pure in-memory)
 * @async
 * @function videoToWebp
 * @param {Buffer} buffer - Video buffer
 * @param {Object} [options={}] - Conversion options
 * @param {number} [options.quality=90] - WebP quality (1-100)
 * @param {number} [options.fps=15] - Output frames per second
 * @param {number} [options.maxDuration=10] - Maximum duration in seconds
 * @returns {Promise<Buffer>} Animated WebP buffer
 * 
 * @throws {Error} If FFmpeg conversion fails
 * 
 * @conversionProcess
 * 1. Spawn FFmpeg with stdin/stdout pipes
 * 2. Write video buffer to stdin
 * 3. Apply animated WebP settings with palette generation
 * 4. Trim duration and adjust fps
 * 5. Read output from stdout
 * 6. Automatic memory cleanup
 * 
 * @ffmpegOptions
 * - Loop: Infinite loop (0)
 * - Duration: First N seconds only
 * - No audio stream
 * - Vsync: 0 for proper frame timing
 * - Palette generation for better quality
 * 
 * @example
 * const videoBuffer = Buffer.from(await fetch('video.mp4').then(r => r.arrayBuffer()));
 * const stickerBuffer = await videoToWebp(videoBuffer, {
 *   quality: 80,
 *   fps: 15,
 *   maxDuration: 5
 * });
 */
export async function videoToWebp(buffer, options = {}) {
	const { quality = 90, fps = 15, maxDuration = 10 } = options;

	const proc = Bun.spawn([
		'ffmpeg',
		'-i', 'pipe:0', // Read from stdin
		'-vcodec', 'libwebp',
		'-vf', `scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=${fps},pad=320:320:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=000000[p];[b][p]paletteuse`,
		'-loop', '0',
		'-ss', '00:00:00',
		'-t', `00:00:${String(maxDuration).padStart(2, '0')}`,
		'-preset', 'default',
		'-an',
		'-vsync', '0',
		'-q:v', quality.toString(),
		'-f', 'webp',
		'pipe:1' // Write to stdout
	], {
		stdin: 'pipe',
		stdout: 'pipe',
		stderr: 'pipe',
	});

	// Write input buffer to stdin
	proc.stdin.write(buffer);
	proc.stdin.end();

	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		const stderr = await new Response(proc.stderr).text();
		throw new Error(`FFmpeg video conversion failed: ${stderr}`);
	}

	// Read output from stdout
	const output = await new Response(proc.stdout).arrayBuffer();
	return Buffer.from(output);
}

/**
 * Adds EXIF metadata to WebP sticker
 * @async
 * @function addExif
 * @param {Buffer} buffer - WebP image buffer
 * @param {string} mimetype - MIME type of original media
 * @param {Object} [metadata={}] - EXIF metadata options
 * @param {string} [metadata.packId] - Sticker pack ID
 * @param {string} [metadata.packName] - Sticker pack name
 * @param {string} [metadata.packPublish] - Publisher name
 * @param {string} [metadata.androidApp] - Android app store link
 * @param {string} [metadata.iOSApp] - iOS app store link
 * @param {string[]} [metadata.emojis] - Associated emojis
 * @param {number} [metadata.isAvatar] - Avatar sticker flag (0 or 1)
 * @returns {Promise<Buffer>} WebP buffer with EXIF metadata
 * 
 * @exifStructure
 * - Pack identification and branding
 * - App store links for attribution
 * - Emoji categories for search
 * - Avatar mode flag
 * 
 * @memoryManagement
 * - Processes entirely in memory
 * - No temporary files created
 * - Automatic garbage collection after return
 * 
 * @example
 * const webpBuffer = await imageToWebp(imageBuffer);
 * const stickerWithExif = await addExif(webpBuffer, 'image/png', {
 *   packName: 'My Stickers',
 *   packPublish: 'John Doe',
 *   emojis: ['😊', '🎉']
 * });
 */
export async function addExif(buffer, mimetype, metadata = {}) {
	// Convert to WebP if not already
	let webpBuffer;
	if (/webp/i.test(mimetype)) {
		webpBuffer = buffer;
	} else if (/image/i.test(mimetype)) {
		webpBuffer = await imageToWebp(buffer);
	} else if (/video/i.test(mimetype)) {
		webpBuffer = await videoToWebp(buffer);
	} else {
		throw new Error(`Unsupported media type: ${mimetype}`);
	}

	// Skip EXIF if no metadata provided
	if (!metadata || Object.keys(metadata).length === 0) {
		return webpBuffer;
	}

	// Prepare EXIF data
	const img = new webp.Image();
	const exifData = {
		'sticker-pack-id': metadata.packId || `liora-${Date.now()}`,
		'sticker-pack-name': metadata.packName || 'Liora Stickers',
		'sticker-pack-publisher': metadata.packPublish || 'Liora Bot',
		'android-app-store-link': metadata.androidApp || 'https://play.google.com/store/apps/details?id=com.whatsapp',
		'ios-app-store-link': metadata.iOSApp || 'https://apps.apple.com/app/whatsapp-messenger/id310633997',
		'emojis': metadata.emojis || ['😋', '😎', '🤣'],
		'is-avatar-sticker': metadata.isAvatar || 0,
	};

	// Create EXIF buffer
	const exifAttr = Buffer.from([
		0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
		0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x16, 0x00, 0x00, 0x00
	]);

	const jsonBuffer = Buffer.from(JSON.stringify(exifData), 'utf-8');
	const exif = Buffer.concat([exifAttr, jsonBuffer]);
	exif.writeUIntLE(jsonBuffer.length, 14, 4);

	// Attach EXIF and save
	await img.load(webpBuffer);
	img.exif = exif;

	return await img.save(null);
}

/**
 * Main sticker conversion function with automatic format detection
 * @async
 * @function sticker
 * @param {Buffer} buffer - Input media buffer
 * @param {Object} [options={}] - Conversion and metadata options
 * @param {boolean} [options.crop=false] - Crop to square (not implemented)
 * @param {number} [options.quality=90] - Output quality (1-100)
 * @param {number} [options.fps=15] - FPS for animated stickers
 * @param {number} [options.maxDuration=10] - Max duration for videos (seconds)
 * @param {string} [options.packName=''] - Sticker pack name
 * @param {string} [options.authorName=''] - Author/publisher name
 * @param {string[]} [options.emojis=[]] - Associated emojis
 * @returns {Promise<Buffer>} WebP sticker with EXIF metadata
 * 
 * @throws {Error} If buffer is invalid or conversion fails
 * 
 * @autoDetection
 * - Detects media type from buffer magic bytes
 * - Chooses appropriate conversion method
 * - Applies EXIF metadata automatically
 * 
 * @supportedFormats
 * - Images: JPEG, PNG, GIF, BMP, TIFF
 * - Videos: MP4, WebM, MKV, MOV, AVI
 * - Output: WebP (static or animated)
 * 
 * @example
 * // From URL
 * const buffer = await fetch('https://example.com/image.jpg')
 *   .then(r => r.arrayBuffer())
 *   .then(b => Buffer.from(b));
 * 
 * const stickerBuffer = await sticker(buffer, {
 *   quality: 85,
 *   packName: 'My Pack',
 *   authorName: 'John Doe',
 *   emojis: ['😊', '🎉']
 * });
 * 
 * // Send sticker
 * await conn.sendMessage(jid, { sticker: stickerBuffer });
 */
export async function sticker(buffer, options = {}) {
	if (!Buffer.isBuffer(buffer)) {
		throw new Error('Input must be a Buffer');
	}

	if (buffer.length === 0) {
		throw new Error('Empty buffer provided');
	}

	// Detect media type from magic bytes
	let mimetype = 'image/png'; // Default fallback

	if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
		mimetype = 'image/jpeg';
	} else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
		mimetype = 'image/png';
	} else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
		mimetype = 'image/gif';
	} else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
		// Check for WEBP
		if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
			mimetype = 'image/webp';
		}
	} else if (
		(buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) ||
		(buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x00)
	) {
		mimetype = 'video/mp4';
	}

	// Extract metadata options
	const metadata = {
		packName: options.packName || '',
		packPublish: options.authorName || '',
		emojis: options.emojis || [],
	};

	// Convert and add EXIF
	const result = await addExif(buffer, mimetype, metadata);

	// Clear buffer from memory (hint to GC)
	buffer = null;

	return result;
}