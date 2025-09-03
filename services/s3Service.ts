// Fix: Import ObjectCannedACL to use its type-safe values.
// The primary S3 client is no longer used for uploads, but ObjectCannedACL is retained for type safety.
import { ObjectCannedACL } from '@aws-sdk/client-s3';
// aws4fetch is used to sign and send requests, avoiding potential environment
// detection issues with the full AWS SDK.
import { AwsClient } from 'aws4fetch';

// ===================================================================================
// !!! SECURITY WARNING !!!
// ===================================================================================
// Storing static credentials in frontend code is highly insecure and strictly for
// demonstration purposes in a controlled environment. In a real-world application,
// use temporary credentials fetched from a secure backend service.
// This configuration is ONLY for the AI Studio sandbox. DO NOT use this in production.
// ===================================================================================


// --- Configuration for iDrive E2 using AWS SDK v3 ---
// This configuration correctly sets up the S3 client for a custom S3-compatible
// endpoint like iDrive E2, ensuring compatibility and proper authentication.
const s3Config = {
    endpoint: "https://soulmatch-uploads-private.u7v1.fra.idrivee2-55.com",
    region: "us-east-1",
    credentials: {
        accessKeyId: "HNsDuYcm7wnCxyxQF3Un",
        secretAccessKey: "yoLnrzFojZkgGYVY0kQVSjbtK8m6z8M6Pgi06DFY",
    },
    // 'forcePathStyle' is crucial for S3-compatible services that don't use
    // the bucket name as a subdomain (like iDrive E2).
    forcePathStyle: true,
    signatureVersion: 'v4',
};

const BUCKET_NAME = 'soulmatch-uploads-private';
// When using aws4fetch, we need a URL object for signing.
const endpointUrl = new URL(s3Config.endpoint);

// Create a single AwsClient instance for signing requests.
const awsClient = new AwsClient({
    accessKeyId: s3Config.credentials.accessKeyId,
    secretAccessKey: s3Config.credentials.secretAccessKey,
    region: s3Config.region,
    service: 's3',
});


export async function uploadFile(file: File): Promise<string> {
    // Use a unique file name to avoid overwrites, sanitizing the original name.
    const sanitizedFileName = file.name.replace(/\s+/g, '_');
    const fileName = `${Date.now()}-${sanitizedFileName}`;
    
    // Construct the URL for the object. `forcePathStyle: true` means the path is /bucket/key.
    const url = new URL(`${endpointUrl.protocol}//${endpointUrl.host}/${BUCKET_NAME}/${fileName}`);

    try {
        const signedRequest = await awsClient.sign(url, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            }
        });

        // FIX: Reconstruct the fetch request to prevent "body already used" errors.
        // The `signedRequest` object's body stream can be consumed during signing or by redirects.
        // By providing the original, re-readable File object as the body, we ensure robustness.
        const response = await fetch(signedRequest.url, {
            method: signedRequest.method,
            headers: signedRequest.headers,
            body: file,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`S3 upload failed with status ${response.status}: ${errorText}`);
        }
        
        // Return the permanent, non-signed URL to be stored in the database.
        return `${s3Config.endpoint}/${BUCKET_NAME}/${fileName}`;
    } catch (error) {
        console.error("Error uploading file with aws4fetch:", error);
        throw new Error("File upload failed. Please check your S3 configuration and network connection.");
    }
}


/**
 * Converts a base64 string to a Blob, which is the standard format for file uploads in the browser.
 * This function is robust and handles the conversion in chunks for performance.
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
 * Uploads a file from a base64 string to S3.
 * This is used for AI-generated images. It converts the base64 to a Blob to ensure
 * compatibility with the browser-based S3 client and avoid environment detection issues.
 * @param base64Data The raw base64 data of the image.
 * @param fileNamePrefix A prefix for the generated file name.
 * @param contentType The MIME type of the image.
 * @returns The public URL of the uploaded file.
 */
export async function uploadBase64File(base64Data: string, fileNamePrefix: string, contentType: string = 'image/jpeg'): Promise<string> {
    const blob = base64ToBlob(base64Data, contentType);
    const fileName = `${Date.now()}-${fileNamePrefix.replace(/\s+/g, '_')}.jpg`;
    
    // Construct the URL for the object. `forcePathStyle: true` means the path is /bucket/key.
    const url = new URL(`${endpointUrl.protocol}//${endpointUrl.host}/${BUCKET_NAME}/${fileName}`);

    try {
        const signedRequest = await awsClient.sign(url, {
            method: 'PUT',
            body: blob,
            headers: {
                'Content-Type': contentType,
            }
        });
        
        // FIX: Reconstruct the fetch request to prevent "body already used" errors,
        // same as in the `uploadFile` function.
        const response = await fetch(signedRequest.url, {
            method: signedRequest.method,
            headers: signedRequest.headers,
            body: blob,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`S3 upload failed with status ${response.status}: ${errorText}`);
        }

        return `${s3Config.endpoint}/${BUCKET_NAME}/${fileName}`;
    } catch (error) {
        console.error("Error uploading base64 file with aws4fetch:", error);
        throw new Error(`File upload from base64 failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Processes an image URL. If the URL is for a private S3 bucket, it fetches the file
 * using signed credentials and returns a temporary, local blob URL for safe display.
 * If the URL is a public, external URL (e.g., from picsum.photos), it returns it directly,
 * allowing the browser's <img> tag to handle it efficiently.
 * @param objectUrl The full URL of the object to display.
 * @returns A promise that resolves to either a local blob URL or the original public URL.
 */
export async function fetchPrivateFile(objectUrl: string): Promise<string> {
    if (!objectUrl) {
        return '';
    }

    // If it's not a private S3 URL, return it directly. The <img> tag can handle public URLs.
    if (!objectUrl.startsWith(s3Config.endpoint)) {
        return objectUrl;
    }

    // It's a private URL, so fetch it and create a temporary blob URL for display.
    try {
        const url = new URL(objectUrl);
        const signedRequest = await awsClient.sign(url, { method: 'GET' });

        const response = await fetch(signedRequest);
        if (!response.ok) {
            console.error(`Failed to fetch private file: ${response.statusText}`, await response.text());
            return ''; // Return empty on failure
        }
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error(`Error fetching private file for ${objectUrl}:`, error);
        return ''; 
    }
}