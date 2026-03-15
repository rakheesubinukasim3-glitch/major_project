import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = '/models';

// Optimized thresholds for AI facial recognition
const FACE_MATCH_THRESHOLD = 0.55; // Stricter matching for higher accuracy
const MIN_FACE_SIZE = 80; // Minimum face bounding box size
const MIN_CONFIDENCE = 0.6; // Minimum detection confidence

/**
 * Haar Cascade-inspired face quality assessment
 * Validates detection based on:
 * - Face size (scale invariance)
 * - Face position (avoid edges)
 * - Contrast and lighting conditions
 */
const assessFaceQuality = (detection: unknown, videoWidth: number, videoHeight: number): boolean => {
    const det = detection as { detection?: { box?: { x: number; y: number; width: number; height: number } } };
    if (!det?.detection?.box) return false;

    const { x, y, width, height } = det.detection.box;
    
    // 1. Face size validation (larger faces = better accuracy)
    if (width < MIN_FACE_SIZE || height < MIN_FACE_SIZE) {
        return false;
    }
    
    // 2. Face position validation (avoid edges - 10% margin)
    const margin = Math.min(videoWidth, videoHeight) * 0.1;
    if (x < margin || y < margin || x + width > videoWidth - margin || y + height > videoHeight - margin) {
        return false;
    }
    
    // 3. Face aspect ratio validation (faces should be roughly square)
    const aspectRatio = width / height;
    if (aspectRatio < 0.7 || aspectRatio > 1.4) {
        return false;
    }
    
    // 4. Confidence score validation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((det.detection as any).score < MIN_CONFIDENCE) {
        return false;
    }
    
    return true;
};

/**
 * Pre-process image for better detection (Haar Cascade preprocessing approach)
 * Enhances contrast and normalizes lighting
 */
const enhanceImageQuality = (canvas: HTMLCanvasElement): void => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // 1. Calculate histogram and apply contrast stretching (Haar-inspired)
    let minVal = 255, maxVal = 0;
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        minVal = Math.min(minVal, gray);
        maxVal = Math.max(maxVal, gray);
    }
    
    // 2. Contrast enhancement (stretches histogram)
    const range = Math.max(maxVal - minVal, 1);
    for (let i = 0; i < data.length; i += 4) {
        const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
        const normalized = Math.round(((gray - minVal) / range) * 255);
        data[i] = normalized;
        data[i + 1] = normalized;
        data[i + 2] = normalized;
    }
    
    ctx.putImageData(imageData, 0, 0);
};

export const loadModels = async () => {
    try {
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        console.log('✓ AI Facial Detection & Recognition Models Loaded Successfully');
        return true;
    } catch (error) {
        console.error('✗ Error loading AI models:', error);
        return false;
    }
};

export const detectFace = async (video: HTMLVideoElement): Promise<unknown> => {
    try {
        // Optimized TinyFaceDetector settings for accuracy
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.55 // Balanced detection threshold
        });
        
        const detection = await faceapi
            .detectSingleFace(video, options)
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        // Validate detection with Haar-inspired quality assessment
        if (detection && assessFaceQuality(detection, video.videoWidth, video.videoHeight)) {
            return detection;
        }
        return null;
    } catch (error) {
        console.error('Face detection error:', error);
        return null;
    }
};

export const getFaceDescriptor = async (image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): Promise<Float32Array | null> => {
    try {
        // Convert to canvas for quality enhancement if needed
        let processedCanvas = image as HTMLCanvasElement;
        if (image instanceof HTMLVideoElement) {
            processedCanvas = document.createElement('canvas');
            processedCanvas.width = image.videoWidth;
            processedCanvas.height = image.videoHeight;
            const ctx = processedCanvas.getContext('2d');
            if (ctx) ctx.drawImage(image, 0, 0);
        } else if (image instanceof HTMLImageElement) {
            processedCanvas = document.createElement('canvas');
            processedCanvas.width = image.width;
            processedCanvas.height = image.height;
            const ctx = processedCanvas.getContext('2d');
            if (ctx) ctx.drawImage(image, 0, 0);
        }
        
        // Apply Haar Cascade-inspired preprocessing
        if (processedCanvas instanceof HTMLCanvasElement) {
            enhanceImageQuality(processedCanvas);
        }
        
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.55
        });
        
        const detection = await faceapi
            .detectSingleFace(processedCanvas, options)
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (detection && detection.descriptor) {
            return detection.descriptor;
        }
        return null;
    } catch (error) {
        console.error('Face descriptor extraction error:', error);
        return null;
    }
};

// Calculate Euclidean distance between face descriptors (128-dimensional space)
export const calculateFaceDistance = (descriptor1: Float32Array | number[], descriptor2: number[]): number => {
    try {
        const arr1 = descriptor1 instanceof Float32Array ? descriptor1 : new Float32Array(descriptor1);
        const arr2 = new Float32Array(descriptor2);
        return faceapi.euclideanDistance(arr1, arr2);
    } catch (error) {
        console.error('Distance calculation error:', error);
        return 1.0;
    }
};

// Check if two faces match (AI recognition comparison)
export const areFacesMatching = (descriptor1: Float32Array | number[], descriptor2: number[]): boolean => {
    const distance = calculateFaceDistance(descriptor1, descriptor2);
    return distance < FACE_MATCH_THRESHOLD;
};

// Batch face detection with quality filtering
export const detectMultipleFaces = async (image: HTMLCanvasElement | HTMLImageElement | HTMLVideoElement): Promise<unknown[]> => {
    try {
        const options = new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.55
        });
        
        const detections = await faceapi
            .detectAllFaces(image, options)
            .withFaceLandmarks()
            .withFaceDescriptors();
        
        // Filter by quality assessment
        const videoWidth = image instanceof HTMLVideoElement ? image.videoWidth : image.width;
        const videoHeight = image instanceof HTMLVideoElement ? image.videoHeight : image.height;
        
        return detections.filter(det => assessFaceQuality(det, videoWidth, videoHeight)) || [];
    } catch (error) {
        console.error('Multiple face detection error:', error);
        return [];
    }
};
