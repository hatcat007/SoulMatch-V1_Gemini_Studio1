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
        // Læs filen ind i et ArrayBuffer for at forhindre stream-genbrugsproblemer.
        // Dette løser "Request object has already been used" fejlen ved samtidige uploads.
        const fileBuffer = await file.arrayBuffer();

        // Brug aws4fetch.fetch() direkte - mere simpelt og effektivt
        const response = await awsClient.fetch(objectUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type || 'application/octet-stream',
            },
            body: fileBuffer, // Brug bufferen i stedet for fil-streamen
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
 * Henter en privat fil og returnerer en signeret URL til direkte brug i <img>-tags.
 * @param objectUrl URL til objektet der skal vises.
 * @returns En signeret URL til billedet.
 */
export async function fetchPrivateFile(objectUrl: string): Promise<string> {
    // Pass-through for non-S3 URLs like blob: or data:
    if (!objectUrl || !objectUrl.startsWith(S3_ENDPOINT)) {
        return objectUrl || '';
    }

    try {
        // Returner den signerede URL direkte i stedet for at hente filen og lave en blob.
        // Dette undgår en ekstra `fetch`-anmodning på klientsiden og løser potentielle
        // problemer med genbrug af Request-objekter.
        return await getSignedUrl(objectUrl);
    } catch (error) {
        console.error(`Fejl ved hentning af fil:`, error);
        return '';
    }
}