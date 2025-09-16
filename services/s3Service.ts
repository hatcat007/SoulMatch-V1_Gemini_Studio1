// This service uses aws4fetch to sign and send requests, avoiding potential environment
// detection issues that can occur with the full AWS SDK in some bundlerless environments.
import { AwsClient } from 'aws4fetch';

// ===================================================================================
// !!! SECURITY WARNING !!!
// ===================================================================================
// Storing static credentials in frontend code is highly insecure and strictly for
// demonstration purposes in a controlled environment. In a real-world application,
// use temporary credentials fetched from a secure backend service.
// This configuration is ONLY for the AI Studio sandbox. DO NOT use this in production.
// ===================================================================================

// --- Configuration for iDrive E2 using AWS SDK v3 style ---
// By separating the endpoint from the bucket, we enforce a "path-style" URL
// structure (e.g., https://endpoint/bucket/key), which is more reliable for many
// S3-compatible services than the "virtual-hosted style" (e.g., https://bucket.endpoint/key).
const S3_ENDPOINT = "https://u7v1.fra.idrivee2-55.com";
const BUCKET_NAME = 'soulmatch-uploads-private';
const S3_REGION = "us-east-1"; // Although iDrive E2 is in FRA, 'us-east-1' is often used as a default region for signing with S3-compatible services.

// Create a single AwsClient instance for signing requests.
const awsClient = new AwsClient({
    accessKeyId: "HNsDuYcm7wnCxyxQF3Un",
    secretAccessKey: "yoLnrzFojZkgGYVY0kQVSjbtK8m6z8M6Pgi06DFY",
    region: S3_REGION,
    service: 's3',
});

/**
 * Uploads a File object to the S3-compatible storage.
 * @param file The File object to upload.
 * @returns The permanent, non-signed URL to be stored in the database.
 */
export async function uploadFile(file: File): Promise<string> {
    // Use a unique file name to avoid overwrites, sanitizing the original name.
    const sanitizedFileName = file.name.replace(/\s+/g, '_');
    const fileName = `${Date.now()}-${sanitizedFileName}`;
    
    // Construct the full path-style URL for the object.
    const objectUrl = `${S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`;

    try {
        // Sign the request. The aws4fetch library needs the body here to calculate the
        // content hash, which is part of the signature. However, this process consumes
        // the readable stream of the 'file' object.
        const signedRequest = await awsClient.sign(objectUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
            }
        });

        // CRITICAL FIX: The `signedRequest` object's body stream might have been consumed during signing.
        // To avoid "TypeError: Failed to fetch" or "Request has already been used" errors,
        // we manually construct a new fetch call using the signed URL and headers, but provide the
        // original, unconsumed 'file' object as the body again.
        const response = await fetch(signedRequest.url, {
            method: signedRequest.method,
            headers: signedRequest.headers,
            body: file, // Provide the original file object again.
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`S3 upload failed with status ${response.status}: ${errorText}`);
        }
        
        // Return the permanent, path-style URL to be stored in the database.
        return objectUrl;
    } catch (error) {
        console.error("Error uploading file with aws4fetch:", error);
        throw new Error("File upload failed. Please check your S3 configuration and network connection.");
    }
}

/**
 * Converts a base64 string to a Blob for uploading.
 * @param base64 The base64 encoded string (without the "data:..." prefix).
 * @param contentType The MIME type of the file.
 * @returns A Blob object.
 */
function base64ToBlob(base64: string, contentType: string): Blob {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }
    return new Blob(byteArrays, { type: contentType });
}

/**
 * Uploads a file from a base64 string, typically for AI-generated images.
 * @param base64Data The raw base64 data of the image.
 * @param fileNamePrefix A prefix for the generated file name.
 * @param contentType The MIME type of the image.
 * @returns The permanent URL of the uploaded file.
 */
export async function uploadBase64File(base64Data: string, fileNamePrefix: string, contentType: string = 'image/jpeg'): Promise<string> {
    const blob = base64ToBlob(base64Data, contentType);
    const fileName = `${Date.now()}-${fileNamePrefix.replace(/\s+/g, '_')}.jpg`;
    
    const objectUrl = `${S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`;

    try {
        const signedRequest = await awsClient.sign(objectUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
            }
        });
        
        // CRITICAL FIX: Reconstruct the fetch call with the original blob to avoid body consumption issues.
        const response = await fetch(signedRequest.url, {
            method: signedRequest.method,
            headers: signedRequest.headers,
            body: blob, // Provide the original blob object again.
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`S3 base64 upload failed with status ${response.status}: ${errorText}`);
        }

        return objectUrl;
    } catch (error) {
        console.error("Error uploading base64 file with aws4fetch:", error);
        throw new Error(`File upload from base64 failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Fetches a private file from S3-compatible storage and returns a local blob URL for safe display.
 * If the URL is not a private S3 URL, it's returned directly.
 * @param objectUrl The full URL of the object to display.
 * @returns A promise that resolves to a local blob URL or the original public URL.
 */
export async function fetchPrivateFile(objectUrl: string): Promise<string> {
    if (!objectUrl) {
        return '';
    }

    // If it's not a private URL from our storage, return it directly.
    if (!objectUrl.startsWith(S3_ENDPOINT)) {
        return objectUrl;
    }

    try {
        // For GET requests, the body is not an issue, so signing the request directly is fine.
        const signedRequest = await awsClient.sign(objectUrl, { method: 'GET' });
        
        const response = await fetch(signedRequest);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch private file: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error(`Error fetching private file for ${objectUrl}:`, error);
        return ''; 
    }
}64Data, contentType);
    const fileName = `${Date.now()}-${fileNamePrefix.replace(/\s+/g, '_')}.jpg`;
    
    const objectUrl = `${S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`;

    try {
        const signedRequest = await awsClient.sign(objectUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
            }
        });
        
        // CRITICAL FIX: Reconstruct the fetch call with the original blob to avoid body consumption issues.
        const response = await fetch(signedRequest.url, {
            method: signedRequest.method,
            headers: signedRequest.headers,
            body: blob, // Provide the original blob object again.
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`S3 base64 upload failed with status ${response.status}: ${errorText}`);
        }

        return objectUrl;
    } catch (error) {
        console.error("Error uploading base64 file with aws4fetch:", error);
        throw new Error(`File upload from base64 failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Fetches a private file from S3-compatible storage and returns a local blob URL for safe display.
 * If the URL is not a private S3 URL, it's returned directly.
 * @param objectUrl The full URL of the object to display.
 * @returns A promise that resolves to a local blob URL or the original public URL.
 */
export async function fetchPrivateFile(objectUrl: string): Promise<string> {
    if (!objectUrl) {
        return '';
    }

    // If it's not a private URL from our storage, return it directly.
    if (!objectUrl.startsWith(S3_ENDPOINT)) {
        return objectUrl;
    }

    try {
        // For GET requests, the body is not an issue, so signing the request directly is fine.
        const signedRequest = await awsClient.sign(objectUrl, { method: 'GET' });
        
        const response = await fetch(signedRequest);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to fetch private file: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error(`Error fetching private file for ${objectUrl}:`, error);
        return ''; 
    }
}