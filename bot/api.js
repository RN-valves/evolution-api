require('dotenv').config();
const axios = require('axios');
const { supabase } = require('./db');

// Note: When running on the same Render service, the bot can call localhost directly to save external network latency!
// We fallback to EVOLUTION_API_URL if localhost isn't running or when testing externally.
const API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const DEFAULT_INSTANCE = process.env.EVOLUTION_DEFAULT_INSTANCE || 'my-bot-3';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Dynamically fetch the API key from the database (or environment variable, or hardcoded fallback)
 */
async function getApiKey() {
  try {
    const { data, error } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', 'evolution_api_key')
      .single();
    if (data && data.value && data.value.trim() && data.value.trim() !== 'undefined') {
      return data.value.trim();
    }
  } catch (err) {
    // Fallback on error
  }
  return process.env.AUTHENTICATION_API_KEY || '429683C4C977415CAAFCCE10F7D57E11';
}

/**
 * Send text message to a user
 */
async function sendText(number, text, instanceName = DEFAULT_INSTANCE) {
  try {
    if (!text && text !== 0) return null;
    let cleanText = typeof text === 'string' ? text.trim() : String(text || '').trim();
    if (!cleanText || cleanText === 'undefined' || cleanText === 'null') return null;

    const apikey = await getApiKey();
    const response = await client.post(`/message/sendText/${instanceName}`, {
      number,
      text: cleanText
    }, {
      headers: {
        'apikey': apikey
      }
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
  if (title && String(title).trim() && String(title).trim() !== 'undefined' && String(title).trim() !== 'null') {
    text += `*${String(title).trim()}*\n`;
  }
  if (description && String(description).trim() && String(description).trim() !== 'undefined' && String(description).trim() !== 'null') {
    text += `${String(description).trim()}\n`;
  }
  text += '\n';
  const buttonsList = Array.isArray(buttons) ? buttons : [];
  const buttonsText = buttonsList.map((b, i) => {
    if (!b) return '';
    const label = b.displayText || b.title || b.text || (typeof b === 'string' ? b : '');
    return (label && label !== 'undefined') ? `*${i + 1}.* ${label}` : '';
  }).filter(Boolean).join('\n');
  text += buttonsText;
  if (footer && String(footer).trim() && String(footer).trim() !== 'undefined' && String(footer).trim() !== 'null') {
    text += `\n\n_${String(footer).trim()}_`;
  }
  return sendText(number, text.trim(), instanceName);
}

/**
 * Send interactive list/menu to a user
 */
async function sendList(number, title, buttonText, sections, description = '', footerText = '', instanceName = DEFAULT_INSTANCE) {
  let listText = '';
  if (title && String(title).trim() && String(title).trim() !== 'undefined' && String(title).trim() !== 'null') {
    listText += `*${String(title).trim()}*\n`;
  }
  if (description && String(description).trim() && String(description).trim() !== 'undefined' && String(description).trim() !== 'null') {
    listText += `${String(description).trim()}\n`;
  }
  listText += '\n';

  let globalIndex = 1;
  const secList = Array.isArray(sections) ? sections : [];
  secList.forEach(sec => {
    if (sec && sec.title && String(sec.title).trim() && String(sec.title).trim() !== 'undefined' && String(sec.title).trim() !== 'null') {
      listText += `*--- ${String(sec.title).trim()} ---*\n`;
    }
    if (sec && Array.isArray(sec.rows)) {
      sec.rows.forEach(row => {
        if (!row) return;
        const rowTitle = row.title || row.displayText || row.text || '';
        if (!rowTitle || rowTitle === 'undefined') return;
        const rowDesc = (row.description && String(row.description).trim() && String(row.description).trim() !== 'undefined' && String(row.description).trim() !== 'null')
          ? ` - _${String(row.description).trim()}_`
          : '';
        listText += `*${globalIndex++}.* ${rowTitle}${rowDesc}\n`;
      });
    }
    listText += '\n';
  });

  if (footerText && String(footerText).trim() && String(footerText).trim() !== 'undefined' && String(footerText).trim() !== 'null') {
    listText += `\n_${String(footerText).trim()}_`;
  }

  return sendText(number, listText.trim(), instanceName);
}

/**
 * Send media (e.g. image, document) to a user via URL
 */
async function sendMediaUrl(number, mediaUrl, mediaType, fileName = '', caption = '', instanceName = DEFAULT_INSTANCE) {
  try {
    const apikey = await getApiKey();
    const cleanCaption = (caption && String(caption).trim() !== 'undefined' && String(caption).trim() !== 'null') ? String(caption).trim() : '';
    const cleanFileName = (fileName && String(fileName).trim() !== 'undefined' && String(fileName).trim() !== 'null') ? String(fileName).trim() : '';

    const response = await client.post(`/message/sendMedia/${instanceName}`, {
      number,
      mediatype: mediaType,
      media: mediaUrl,
      fileName: cleanFileName,
      caption: cleanCaption
    }, {
      headers: {
        'apikey': apikey
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error sending media to ${number}:`, error.response?.data || error.message);
    const cleanCaption = (caption && String(caption).trim() !== 'undefined' && String(caption).trim() !== 'null') ? String(caption).trim() : '';
    const fallbackText = cleanCaption ? `${cleanCaption}\n\nAttachment: ${mediaUrl}` : `Attachment: ${mediaUrl}`;
    return sendText(number, fallbackText, instanceName);
  }
}

module.exports = {
  sendText,
  sendButtons,
  sendList,
  sendMediaUrl
};
