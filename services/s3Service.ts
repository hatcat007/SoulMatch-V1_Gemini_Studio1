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
