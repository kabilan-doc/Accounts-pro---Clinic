import Twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
const authToken = process.env.TWILIO_AUTH_TOKEN || '';
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || '';

export async function sendWhatsAppMessage(message: string, recipients: string[]) {
  if (!accountSid || !authToken || !whatsappFrom || recipients.length === 0) {
    return { success: false, error: 'Twilio configuration is incomplete.' };
  }

  const client = Twilio(accountSid, authToken);

  try {
    const results = await Promise.all(
      recipients.map(number =>
        client.messages.create({
          body: message,
          from: whatsappFrom,
          to: number
        })
      )
    );
    return { success: true, results };
  } catch (error) {
    return { success: false, error };
  }
}
