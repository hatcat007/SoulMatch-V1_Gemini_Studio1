// FIX: Corrected the Supabase edge function types reference. The previous URL with a version specifier was incorrect, causing TypeScript to not find the type definitions for the Deno runtime.
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const APP_URL = 'https://soulmatchdk.app';

// --- EMAIL TEMPLATES ---

const mainTemplate = (subject: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap');
    body { font-family: 'Nunito', sans-serif; margin: 0; padding: 0; background-color: #F8F9FA; color: #212529; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; }
    .header { text-align: center; padding: 20px 0; border-bottom: 1px solid #E6F0F1; }
    .header img { width: 150px; }
    .content { padding: 30px 20px; }
    .footer { text-align: center; font-size: 12px; color: #6C757D; padding: 20px; border-top: 1px solid #E6F0F1; }
    .button { display: inline-block; background-color: #006B76; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 50px; font-weight: bold; }
    h1 { color: #006B76; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://q1f3.c3.e2-9.dev/soulmatch-uploads-public/SoulMatch%20logo.jpeg" alt="SoulMatch Logo">
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Du modtager denne e-mail, fordi du har en profil på SoulMatch.</p>
      <p>Administrer dine <a href="${APP_URL}/#/settings">notifikationsindstillinger</a>.</p>
      <p>&copy; ${new Date().getFullYear()} SoulMatch. Alle rettigheder forbeholdes.</p>
    </div>
  </div>
</body>
</html>
`;

const getNewMessageHtml = (data: { senderName: string; messagePreview: string; chatId: string }) => `
  <h1>Du har en ny besked!</h1>
  <p style="font-size: 16px;">Hej, du har modtaget en ny besked fra <strong>${data.senderName}</strong>.</p>
  <div style="background-color: #F8F9FA; border-left: 4px solid #006B76; padding: 15px; margin: 20px 0; font-style: italic;">
    <p>"${data.messagePreview}"</p>
  </div>
  <p style="text-align: center; margin: 30px 0;">
    <a href="${APP_URL}/#/chat/${data.chatId}" class="button">Læs beskeden</a>
  </p>
  <p>For at bevare fokus på virkelige møder, udløber nye chats efter 3 dage, medmindre I mødes.</p>
`;

const getAdminBroadcastHtml = (data: { subject: string; body: string }) => `
  <h1>${data.subject}</h1>
  <div style="font-size: 16px; line-height: 1.6;">
    ${data.body}
  </div>
`;

// --- EDGE FUNCTION ---

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Check for required environment variables
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Function Error: Missing required environment variables.');
      throw new Error('Server configuration error.');
    }

    // 2. Parse request body and validate
    const { template, recipientId, recipientType, data } = await req.json();
    console.log('Function invoked with payload:', { template, recipientId, recipientType, data });
    
    if (!template || !recipientId || !data) {
        throw new Error('Invalid request payload. Missing template, recipientId, or data.');
    }

    // 3. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    console.log('Supabase admin client initialized.');

    let to: string | undefined;
    let subject: string;
    let htmlContent: string;
    let shouldSend = true;

    // 4. Determine email content based on template
    if (template === 'new-message') {
      console.log(`Fetching user info for new-message: ID ${recipientId}`);
      const { data: userData, error } = await supabaseAdmin.from('users').select('email, email_notifications_new_message').eq('id', recipientId).single();
      if (error || !userData) throw new Error(`User ${recipientId} not found.`);
      if (!userData.email) throw new Error(`User ${recipientId} has no email.`);
      if (!userData.email_notifications_new_message) {
        shouldSend = false;
        console.log(`User ${recipientId} has disabled new message notifications. No email will be sent.`);
      }
      to = userData.email;
      subject = `Ny besked fra ${data.senderName} på SoulMatch`;
      htmlContent = getNewMessageHtml(data);

    } else if (template === 'admin-broadcast') {
        const table = recipientType === 'user' ? 'users' : 'organizations';
        console.log(`Fetching recipient info for admin-broadcast: Type ${table}, ID ${recipientId}`);
        const { data: recipientData, error } = await supabaseAdmin.from(table).select('email').eq('id', recipientId).single();
        if (error || !recipientData) throw new Error(`${recipientType} ${recipientId} not found.`);
        if (!recipientData.email) throw new Error(`${recipientType} ${recipientId} has no email.`);
        
        to = recipientData.email;
        subject = data.subject;
        const formattedBody = data.body.replace(/\n/g, '<br />');
        htmlContent = getAdminBroadcastHtml({ subject: data.subject, body: formattedBody });
    } else {
        throw new Error(`Invalid email template specified: ${template}`);
    }

    // 5. Send email via Resend if conditions are met
    if (shouldSend && to) {
      console.log(`Attempting to send email to ${to} with subject "${subject}"`);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'SoulMatch <noreply@soulmatchdk.app>',
          to: to,
          subject: subject,
          html: mainTemplate(subject, htmlContent),
        }),
      });

      if (!res.ok) {
        const errorBody = await res.json();
        console.error('Resend API Error:', errorBody);
        throw new Error(`Resend API failed with status ${res.status}. Details: ${JSON.stringify(errorBody)}`);
      }
      console.log('Email sent successfully via Resend.');
    }

    // 6. Return success response
    return new Response(JSON.stringify({ success: true, sent: shouldSend }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // 7. Catch and return any errors
    console.error('Unhandled error in send-email function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});