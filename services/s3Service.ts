import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// ===================================================================================
// !!! SECURITY WARNING !!!
// ===================================================================================
// Embedding access keys directly in your frontend code is extremely insecure.
// These keys can be easily discovered by anyone viewing your site's source code,
// giving them full access to your S3 bucket.
//
// For a production application, you MUST use a backend service to generate
// secure, temporary presigned URLs for uploads. The frontend should request a
// presigned URL and then use that to upload the file.
//
// This implementation is for demonstration purposes only, based on the user's request.
// DO NOT USE THIS IN PRODUCTION.
// ===================================================================================

// --- Configuration ---
const BUCKET_NAME = 'soulmatch-uploads-private';
const ENDPOINT = 'https://u7v1.fra.idrivee2-55.com';
// A placeholder region is required to prevent the SDK from searching the filesystem.
const REGION = 'us-east-1'; 
const ACCESS_KEY_ID = 'HNsDuYcm7wnCxyxQF3Un';
const SECRET_ACCESS_KEY = 'yoLnrzFojZkgGYVY0kQVSjbtK8m6z8M6Pgi06DFY';
// --- End of Configuration ---

// FIX: The AWS SDK v3's default configuration provider chain attempts to access the
// file system (`fs`) to find credentials and region, which is not available in the browser
// and causes an error. To prevent this, we explicitly provide static credentials
// and a static region. This short-circuits the provider chain and ensures the SDK
// does not attempt to read from the local file system.
const s3Client = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  // We use the default virtual-hosted style (forcePathStyle: false) which is
  // common for S3-compatible services.
});

/**
 * Uploads a file to the configured S3-compatible storage.
 * 
 * @param file The file to be uploaded.
 * @returns A promise that resolves to the public URL of the uploaded file.
 */
export async function uploadFile(file: File): Promise<string> {
    // Sanitize the file name and make it unique to prevent overwrites.
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: file,
        ContentType: file.type,
        ACL: 'public-read', // This makes the uploaded file publicly accessible via its URL.
    });

    try {
        console.log(`Uploading ${fileName} to S3...`);
        await s3Client.send(command);

        // Construct the public URL for the file using virtual-hosted style.
        // Format: https://<bucket>.<endpoint_host>/<key>
        const endpointHost = ENDPOINT.replace('https://', '');
        const fileUrl = `https://${BUCKET_NAME}.${endpointHost}/${fileName}`;
        
        console.log(`Successfully uploaded. URL: ${fileUrl}`);
        return fileUrl;

    } catch (error) {
        console.error("Error uploading file to S3:", error);
        // Provide a more user-friendly error message.
        throw new Error("File upload failed. Please check your S3 configuration and network connection.");
    }
}