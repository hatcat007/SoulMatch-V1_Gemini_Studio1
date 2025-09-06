// Optimeret S3 service med aws4fetch - simpel, hurtig og effektiv
import { AwsClient } from 'aws4fetch';

// ===================================================================================
// !!! SECURITY WARNING !!!
// ===================================================================================
// Storing static credentials in frontend code is highly insecure and strictly for
// demonstration purposes in a controlled environment. In a real-world application,
// use temporary credentials fetched from a secure backend service.
// This configuration is ONLY for the AI Studio sandbox. DO NOT use this in production.
// ===================================================================================

const S3_ENDPOINT = "https://u7v1.fra.idrivee2-55.com";
const BUCKET_NAME = 'soulmatch-uploads-private';
const S3_REGION = "us-east-1";

// Enkelt AwsClient instans til alle requests
const awsClient = new AwsClient({
    accessKeyId: "HNsDuYcm7wnCxyxQF3Un",
    secretAccessKey: "yoLnrzFojZkgGYVY0kQVSjbtK8m6z8M6Pgi06DFY",
    region: S3_REGION,
    service: 's3',
});

/**
 * Uploader en fil til S3-kompatibel storage.
 * @param file File objektet der skal uploades.
 * @returns Den permanente URL til filen.
 */
export async function uploadFile(file: File): Promise<string> {
    const sanitizedFileName = file.name.replace(/\s+/g, '_');
    const fileName = `${Date.now()}-${sanitizedFileName}`;
    const objectUrl = `${S3_ENDPOINT}/${BUCKET_NAME}/${fileName}`;

    try {
        // Brug aws4fetch.fetch() direkte - mere simpelt og effektivt
        const response = await awsClient.fetch(objectUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
            },
            body: file,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`S3 upload failed: ${response.status} ${errorText}`);
        }
        
        return objectUrl;
    } catch (error) {
        console.error("Upload fejl:", error);
        throw new Error("File upload failed. Check S3 configuration.");
    }
}

/**
 * Konverterer base64 string til File objekt.
 * @param base64 Base64 string (uden data: prefix).
 * @param fileName Filnavn.
 * @param contentType MIME type.
 * @returns File objekt.
 */
function base64ToFile(base64: string, fileName: string, contentType: string = 'image/jpeg'): File {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new File([byteArray], fileName, { type: contentType });
}

/**
 * Uploader base64 data som fil - kompatibilitetsfunktion.
 * @param base64Data Base64 data.
 * @param fileNamePrefix Filnavn prefix.
 * @param contentType MIME type.
 * @returns URL til uploaded fil.
 */
export async function uploadBase64File(base64Data: string, fileNamePrefix: string, contentType: string = 'image/jpeg'): Promise<string> {
    const fileName = `${fileNamePrefix.replace(/\s+/g, '_')}.jpg`;
    const file = base64ToFile(base64Data, fileName, contentType);
    return uploadFile(file);
}

/**
 * Henter en privat fil fra S3 og returnerer en signeret URL.
 * @param objectUrl URL til objektet der skal hentes.
 * @returns Signeret URL eller tom streng ved fejl.
 */
export async function getSignedUrl(objectUrl: string): Promise<string> {
    if (!objectUrl || !objectUrl.startsWith(S3_ENDPOINT)) {
        return objectUrl || '';
    }

    try {
        // Generer presigned URL med signQuery: true
        const signedRequest = await awsClient.sign(objectUrl, { 
            method: 'GET',
            aws: {
                signQuery: true  // Signer query string i stedet for Authorization header
            }
        });
        return signedRequest.url.toString();
    } catch (error) {
        console.error(`Fejl ved generering af signeret URL:`, error);
        return '';
    }
}

/**
 * Henter en privat fil og returnerer blob URL til visning.
 * @param objectUrl URL til objektet der skal vises.
 * @returns Blob URL eller original URL.
 */
export async function fetchPrivateFile(objectUrl: string): Promise<string> {
    if (!objectUrl || !objectUrl.startsWith(S3_ENDPOINT)) {
        return objectUrl || '';
    }

    try {
        // Generer signeret URL først
        const signedUrl = await getSignedUrl(objectUrl);
        if (!signedUrl) {
            throw new Error('Kunne ikke generere signeret URL');
        }
        
        // Fetch med den signerede URL
        const response = await fetch(signedUrl);
        
        if (!response.ok) {
            throw new Error(`Fetch fejl: ${response.status}`);
        }
        
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (error) {
        console.error(`Fejl ved hentning af fil:`, error);
        return '';
    }
}