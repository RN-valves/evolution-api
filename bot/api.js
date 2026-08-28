require('dotenv').config();
const axios = require('axios');

// Note: When running on the same Render service, the bot can call localhost directly to save external network latency!
// We fallback to EVOLUTION_API_URL if localhost isn't running or when testing externally.
const API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const API_KEY = '429683C4C977415CAAFCCE10F7D57E11';
const DEFAULT_INSTANCE = process.env.EVOLUTION_DEFAULT_INSTANCE || 'evolution';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'apikey': API_KEY
  }
});

/**
 * Send text message to a user
 */
async function sendText(number, text, instanceName = DEFAULT_INSTANCE) {
  try {
    const response = await client.post(`/message/sendText/${instanceName}`, {
      number,
      text
    });
    return response.data;
  } catch (error) {
    console.error(`Error sending text to ${number} (instance: ${instanceName}):`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send interactive buttons to a user
 */
async function sendButtons(number, title, buttons, description = '', footer = '', instanceName = DEFAULT_INSTANCE) {
  let text = '';
  if (title) text += `*${title}*\n`;
  if (description) text += `${description}\n`;
  text += '\n';
  const buttonsText = buttons.map((b, i) => `*${i + 1}.* ${b.displayText}`).join('\n');
  text += buttonsText;
  if (footer) text += `\n\n_${footer}_`;
  return sendText(number, text.trim(), instanceName);
}

/**
 * Send interactive list/menu to a user
 */
async function sendList(number, title, buttonText, sections, description = '', footerText = '', instanceName = DEFAULT_INSTANCE) {
  try {
    const response = await client.post(`/message/sendList/${instanceName}`, {
      number,
      title,
      description,
      footerText,
      buttonText,
      sections
    });
    return response.data;
  } catch (error) {
    console.error(`Error sending list to ${number}:`, error.response?.data || error.message);
    let listText = `${title}\n\n`;
    sections.forEach(sec => {
      listText += `*--- ${sec.title} ---*\n`;
      sec.rows.forEach((row, i) => {
        listText += `*${i + 1}.* ${row.title} - ${row.description}\n`;
      });
      listText += '\n';
    });
    return sendText(number, listText.trim(), instanceName);
  }
}

/**
 * Send media (e.g. image, document) to a user via URL
 */
async function sendMediaUrl(number, mediaUrl, mediaType, fileName = '', caption = '', instanceName = DEFAULT_INSTANCE) {
  try {
    const response = await client.post(`/message/sendMedia/${instanceName}`, {
      number,
      mediatype: mediaType,
      media: mediaUrl,
      fileName,
      caption
    });
    return response.data;
  } catch (error) {
    console.error(`Error sending media to ${number}:`, error.response?.data || error.message);
    return sendText(number, `${caption}\n\nAttachment: ${mediaUrl}`, instanceName);
  }
}

module.exports = {
  sendText,
  sendButtons,
  sendList,
  sendMediaUrl
};
