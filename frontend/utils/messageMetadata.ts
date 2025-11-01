declare const Buffer: any;

import { MessageMetadata } from '../types';

const METADATA_MARKER = '\n---\n[metadata]:';

const encodeBase64 = (value: string): string => {
  if (typeof globalThis.btoa === 'function') {
    const binary = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    );
    return globalThis.btoa(binary);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64');
  }
  throw new Error('Base64 encoding is not supported in this environment');
};

const decodeBase64 = (value: string): string => {
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(value);
    const percentEncoded = Array.from(binary)
      .map(char => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
      .join('');
    return decodeURIComponent(percentEncoded);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'base64').toString('utf-8');
  }
  throw new Error('Base64 decoding is not supported in this environment');
};

export const appendMetadataToContent = (content: string, metadata: MessageMetadata): string => {
  const encoded = encodeBase64(JSON.stringify(metadata));
  return `${content}\n\n${METADATA_MARKER}${encoded}`;
};

export const extractMetadataFromContent = (
  content: string,
): { cleanedContent: string; metadata?: MessageMetadata } => {
  const markerIndex = content.lastIndexOf(METADATA_MARKER);
  if (markerIndex === -1) {
    return {
      cleanedContent: content.trim(),
    };
  }

  const metadataSegment = content.slice(markerIndex + METADATA_MARKER.length).trim();
  const cleaned = content.slice(0, markerIndex).trim();

  if (!metadataSegment) {
    return {
      cleanedContent: cleaned,
    };
  }

  try {
    const decoded = decodeBase64(metadataSegment);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === 'object' && parsed.type === 'leave-request') {
      return {
        cleanedContent: cleaned,
        metadata: parsed as MessageMetadata,
      };
    }
  } catch (error) {
    console.warn('Failed to parse message metadata block', error);
  }

  return {
    cleanedContent: cleaned,
  };
};
