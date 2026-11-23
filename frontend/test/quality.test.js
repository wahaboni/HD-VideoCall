import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALITY_PRESETS,
  DEFAULT_QUALITY,
  normalizeQuality,
  videoCaptureDefaults,
  roomOptions,
  qualityForNetwork,
  qualityPreset,
} from '../src/lib/quality.js';

test('default kualitas 720p', () => {
  assert.equal(DEFAULT_QUALITY, '720p');
});

test('preset 720p = 1280x720 @30fps', () => {
  assert.deepEqual(QUALITY_PRESETS['720p'], {
    key: '720p',
    label: 'HD 720p',
    width: 1280,
    height: 720,
    frameRate: 30,
    maxBitrate: 2_500_000,
  });
});

test('preset 1080p = 1920x1080 @30fps', () => {
  assert.deepEqual(QUALITY_PRESETS['1080p'], {
    key: '1080p',
    label: 'Full HD 1080p',
    width: 1920,
    height: 1080,
    frameRate: 30,
    maxBitrate: 4_500_000,
  });
});

test('preset 360p hemat bandwidth', () => {
  assert.deepEqual(QUALITY_PRESETS['360p'], {
    key: '360p',
    label: 'Low 360p',
    width: 640,
    height: 360,
    frameRate: 24,
    maxBitrate: 700_000,
  });
});

test('normalizeQuality fallback ke 720p', () => {
  assert.equal(normalizeQuality('1080p'), '1080p');
  assert.equal(normalizeQuality('720p'), '720p');
  assert.equal(normalizeQuality('4k'), '720p');
  assert.equal(normalizeQuality(undefined), '720p');
  assert.equal(normalizeQuality('auto'), 'auto');
});

test('AUTO mulai 720p dan turun satu tier saat jaringan buruk', () => {
  assert.equal(qualityForNetwork({ packetLoss: 0, rtt: 80 }), '720p');
  assert.equal(qualityForNetwork({ packetLoss: 0.1, rtt: 80, current: '720p' }), '360p');
  assert.equal(qualityForNetwork({ packetLoss: 0.1, rtt: 80, current: '1080p' }), '720p');
});

test('AUTO naik satu tier hanya saat jaringan stabil', () => {
  assert.equal(qualityForNetwork({ packetLoss: 0.01, rtt: 100, current: '720p' }), '1080p');
  assert.equal(qualityForNetwork({ packetLoss: 0.03, rtt: 100, current: '720p' }), '720p');
  assert.equal(qualityForNetwork({ packetLoss: undefined, rtt: undefined, current: '720p' }), '720p');
});

test('videoCaptureDefaults memakai resolusi preset', () => {
  assert.deepEqual(videoCaptureDefaults('1080p'), {
    resolution: { width: 1920, height: 1080, frameRate: 30 },
  });
  assert.deepEqual(videoCaptureDefaults('720p'), {
    resolution: { width: 1280, height: 720, frameRate: 30 },
  });
});

test('roomOptions menyalakan adaptiveStream, simulcast, dynacast', () => {
  const options = roomOptions('720p');
  assert.equal(options.adaptiveStream, true);
  assert.equal(options.dynacast, true);
  assert.equal(options.publishDefaults.simulcast, true);
  assert.equal(options.videoCaptureDefaults.resolution.width, 1280);
  assert.equal(options.screenShareCaptureDefaults.resolution.width, 1920);
  assert.equal(options.screenShareCaptureDefaults.resolution.height, 1080);

  const layers = options.publishDefaults.videoSimulcastLayers;
  assert.ok(Array.isArray(layers));
  assert.ok(layers.length >= 2);
  const sorted = [...layers].sort((a, b) => a.width - b.width);
  assert.deepEqual(layers, sorted);
  assert.ok(layers.at(-1).width <= 1280);
});

test('roomOptions 1080p punya layer sampai 1080p', () => {
  const options = roomOptions('1080p');
  assert.equal(options.videoCaptureDefaults.resolution.width, 1920);
  assert.equal(options.publishDefaults.videoSimulcastLayers.at(-1).width, 1920);
});

test('quality invalid tidak melempar error', () => {
  const options = roomOptions('bogus');
  assert.equal(options.videoCaptureDefaults.resolution.width, 1280);
});

test('qualityPreset AUTO memakai baseline 720p', () => {
  assert.equal(qualityPreset('auto').key, '720p');
});
