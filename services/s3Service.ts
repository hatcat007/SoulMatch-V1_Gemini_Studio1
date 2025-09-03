// Fix: Import ObjectCannedACL to use its type-safe values.
// FIX: Changed S3Client to S3 to resolve a potential type resolution issue where the `send` method was not found.
import { S3, PutObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';

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
    endpoint: "https://u7v1.fra.idrivee2-55.com",
    region: "us-east-1",
    credentials: {
        accessKeyId: "PUjq826EZ5ihLJqcDBJ8",
        secretAccessKey: "lKLXMAOGhy8f5bMtbwo00XtQndzeWUtSdCbKUsVf",
    },
    // 'forcePathStyle' is crucial for S3-compatible services that don't use
    // the bucket name as a subdomain (like iDrive E2).
    forcePathStyle: true,
    signatureVersion: 'v4',
};

const BUCKET_NAME = 'soulmatch-uploads-public';
const PUBLIC_URL_BASE = `${s3Config.endpoint}/${BUCKET_NAME}`;

export async function uploadFile(file: File): Promise<string> {
    // Create the S3 client "just-in-time" inside the upload function.
    // This is a robust pattern that ensures the client is instantiated in a clean
    // browser execution context, avoiding environment detection conflicts caused
    // by polyfills from other services (which leads to the 'fs.readFile' error).
    // FIX: Changed S3Client to S3. The S3 class extends S3Client and should also have the .send() method.
    const s3Client = new S3(s3Config);
    
    // Use a unique file name to avoid overwrites, sanitizing the original name.
    const sanitizedFileName = file.name.replace(/\s+/g, '_');
    const fileName = `${Date.now()}-${sanitizedFileName}`;
    
    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: file,
        // The ACL (Access Control List) makes the uploaded object publicly readable.
        // Fix: Use the ObjectCannedACL enum for type safety, resolving the assignment error.
        ACL: ObjectCannedACL.public_read,
        ContentType: file.type,
    };

    try {
        await s3Client.send(new PutObjectCommand(params));
        // Construct the public URL for the uploaded file.
        const url = `${PUBLIC_URL_BASE}/${fileName}`;
        return url;
    } catch (error) {
        console.error("Error uploading file to S3:", error);
        throw new Error("File upload failed. Please check your S3 configuration and network connection.");
    }
}


/**
 * Converts a base64 string to a Uint8Array.
 * @param base64 The base64 encoded string.
 * @returns A Uint8Array containing the binary data.
 */
function base64ToUint8Array(base64: string): Uint8Array {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    return new Uint8Array(byteNumbers);
}


/**
 * Uploads a file represented by a base64 string to S3.
 * @param base64String The base64 encoded file content.
 * @param fileName The desired file name in the bucket.
 * @param contentType The MIME type of the file.
 * @returns The public URL of the uploaded file.
 */
export async function uploadBase64File(base64String: string, fileName: string, contentType: string = 'image/jpeg'): Promise<string> {
    const s3Client = new S3(s3Config);
    // FIX: Convert the base64 string directly into its raw binary data (a Uint8Array).
    // This is a more robust, low-level approach that bypasses the AWS SDK's environment
    // detection logic, which was incorrectly attempting to use the Node.js filesystem API (`fs`)
    // in the browser, causing the "fs.readFile is not implemented" error.
    const body = base64ToUint8Array(base64String);

    const params = {
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: body,
        ACL: ObjectCannedACL.public_read,
        ContentType: contentType,
        ContentLength: body.byteLength, // Adding content length is good practice
    };

    try {
        await s3Client.send(new PutObjectCommand(params));
        const url = `${PUBLIC_URL_BASE}/${fileName}`;
        return url;
    } catch (error: any) {
        console.error("Error uploading base64 file to S3:", error);
        // FIX: Improved error message to be more specific.
        throw new Error(`File upload from base64 failed: ${error.message || 'Unknown S3 error'}`);
    }
}