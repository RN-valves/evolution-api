require('dotenv').config();
const path = require('path');
const express = require('express');
const { supabase } = require('./db');
const { sendText, sendButtons, sendList, sendMediaUrl } = require('./api');

const app = express();
app.use(express.json());

const PORT = process.env.BOT_PORT || 3000;

// Set to prevent duplicate webhook processing (e.g. global + instance webhooks)
const processedMessages = new Set();

const locales = {
  English: {
    welcome: "Welcome to RN Valves! Please select your language / भाषा चुनें:",
    assistance: "Select the type of assistance you need:",
    business: "What is your Business Type?",
    nextAction: "What would you like to do next?",
    categories: "Select a Product Category:",
    subcategories: "Select a Subcategory/Collection:",
    introCaption: "Here is an introduction to our {subcategory} collection!",
    formStart: "Before we proceed, please share your details.\n\n*What is your Full Name?*",
    askMobile: "Please enter your *Mobile Number*:",
    askBusiness: "What is your *Business Name*?",
    askCity: "Enter your *City*:",
    askState: "Enter your *State* (e.g. Rajasthan, Bihar, Delhi):",
    askRequirement: "What is your *Requirement / Message*?",
    thankYou: "Thank you, {name}! Your details have been saved.\n\nOur agent *{agentName}* has been assigned to assist you. You can contact them at *{agentPhone}*."
  },
  Hindi: {
    welcome: "आरएन वाल्व्स (RN Valves) में आपका स्वागत है! कृपया अपनी भाषा चुनें:",
    assistance: "आपको किस प्रकार की सहायता की आवश्यकता है?",
    business: "आपका व्यवसाय किस प्रकार का है?",
    nextAction: "आप आगे क्या करना चाहेंगे?",
    categories: "कृपया उत्पाद श्रेणी चुनें:",
    subcategories: "कृपया उपश्रेणी (Subcategory) चुनें:",
    introCaption: "यह हमारी {subcategory} कलेक्शन का परिचय है!",
    formStart: "आगे बढ़ने से पहले, कृपया अपना विवरण साझा करें।\n\n*आपका पूरा नाम क्या है?*",
    askMobile: "कृपया अपना *मोबाइल नंबर* दर्ज करें:",
    askBusiness: "आपके *व्यवसाय का नाम* क्या है?",
    askCity: "अपना *शहर* दर्ज करें:",
    askState: "अपना *राज्य* दर्ज करें (जैसे: राजस्थान, बिहार, दिल्ली):",
    askRequirement: "आपकी *आवश्यकता / संदेश* क्या है?",
    thankYou: "धन्यवाद, {name}! आपका विवरण सहेज लिया गया है।\n\nहमारे एजेंट *{agentName}* को आपकी सहायता के लिए नियुक्त किया गया है। आप उनसे *{agentPhone}* पर संपर्क कर सकते हैं।"
  },
  Bengali: {
    welcome: "RN Valves-এ আপনাকে স্বাগতম! অনুগ্রহ করে আপনার ভাষা নির্বাচন করুন:",
    assistance: "আপনার কি ধরণের সহায়তা প্রয়োজন তা নির্বাচন করুন:",
    business: "আপনার ব্যবসার ধরণ কি?",
    nextAction: "আপনি পরবর্তীতে কি করতে চান?",
    categories: "একটি পণ্য বিভাগ নির্বাচন করুন:",
    subcategories: "একটি উপবিভাগ নির্বাচন করুন:",
    introCaption: "এখানে আমাদের {subcategory} কালেকশনের বিবরণ দেওয়া হলো!",
    formStart: "এগিয়ে যাওয়ার আগে, অনুগ্রহ করে আপনার বিবরণ লিখুন।\n\n*আপনার পুরো নাম কি?*",
    askMobile: "অনুগ্রহ করে আপনার *মোবাইল নম্বর* লিখুন:",
    askBusiness: "আপনার *ব্যবসার নাম* কি?",
    askCity: "আপনার *শহর* লিখুন:",
    askState: "আপনার *রাজ্য* লিখুন (যেমন: রাজস্থান, বিহার, দিল্লি):",
    askRequirement: "আপনার *প্রয়োজন বা বার্তা* কি?",
    thankYou: "ধন্যবাদ, {name}! আপনার বিবরণ সংরক্ষণ করা হয়েছে।\n\nআমাদের এজেন্ট *{agentName}* আপনার সহায়তার জন্য নিযুক্ত হয়েছেন। আপনি ওনাকে *{agentPhone}* নম্বরে কল করতে পারেন।"
  },
  Marathi: {
    welcome: "आरएन व्हॉल्व्हज (RN Valves) मध्ये आपले स्वागत आहे! कृपया आपली भाषा निवडा:",
    assistance: "तुम्हाला कोणत्या प्रकारच्या मदतीची आवश्यकता आहे?",
    business: "तुमच्या व्यवसायाचा प्रकार काय आहे?",
    nextAction: "तुम्हाला पुढे काय करायला आवडेल?",
    categories: "उत्पादनाची श्रेणी निवडा:",
    subcategories: "उपश्रेणी निवडा:",
    introCaption: "आमच्या {subcategory} कलेक्शनची माहिती खालीलप्रमाणे आहे:",
    formStart: "पुढे जाण्यापूर्वी, कृपया आपली माहिती शेअर करा।\n\n*तुमचे पूर्ण नाव काय आहे?*",
    askMobile: "कृपया तुमचा *मोबाईल नंबर* टाका:",
    askBusiness: "तुमच्या *व्यवसायाचे नाव* काय आहे?",
    askCity: "तुमचे *शहर* सांगा:",
    askState: "तुमचे *राज्य* सांगा (उदा. राजस्थान, बिहार, दिल्ली):",
    askRequirement: "तुमची *गरज / संदेश* काय आहे?",
    thankYou: "धन्यवाद, {name}! तुमची माहिती जतन करण्यात आली आहे।\n\nआमचे एजंट *{agentName}* आपल्या मदतीसाठी नियुक्त केले आहेत. आपण त्यांना *{agentPhone}* वर कॉल करू शकता।"
  }
};

async function getConfigValue(key, defaultValue) {
  try {
    const { data, error } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', key)
      .single();

    if (error) {
      if (error.code !== 'PGRST116') {
        console.error(`Error fetching config ${key}:`, error);
      }
      return defaultValue;
    }
    return data.value || defaultValue;
  } catch (err) {
    console.error(`Error in getConfigValue for ${key}:`, err);
    return defaultValue;
  }
}

async function getAgentForState(state) {
  const s = (state || '').toLowerCase().trim();
  if (s.includes('rajasthan')) {
    const phone = await getConfigValue('agent_gaurav_phone', '+91 99999 99991');
    return { name: 'Gaurav', phone };
  } else if (s.includes('kerala') || s.includes('delhi') || s.includes('jammu') || s.includes('kashmir') || s.includes('jk') || s.includes('j&k')) {
    const phone = await getConfigValue('agent_danish_phone', '+91 99999 99992');
    return { name: 'Danish', phone };
  } else if (s.includes('uttar pradesh') || s.includes('up') || s.includes('bihar')) {
    const phone = await getConfigValue('agent_arpita_phone', '+91 99999 99993');
    return { name: 'Arpita', phone };
  } else if (s.includes('maharashtra') || s.includes('mh') || s.includes('karnataka') || s.includes('ka') || s.includes('madhya pradesh') || s.includes('mp')) {
    const phone = await getConfigValue('agent_vinod_phone', '+91 99999 99994');
    return { name: 'Vinod Kumar', phone };
  } else if (s.includes('hayana') || s.includes('hanya') || s.includes('hr') || s.includes('gujarat') || s.includes('gj') || s.includes('punjab') || s.includes('pb') || s.includes('uttarakhand') || s.includes('uk') || s.includes('himachal') || s.includes('hp')) {
    const phone = await getConfigValue('agent_amit_phone', '+91 99999 99995');
    return { name: 'Amit', phone };
  } else {
    const phone = await getConfigValue('agent_danish_phone', '+91 99999 99992');
    return { name: 'Danish (Default)', phone };
  }
}

function getIncomingMessage(body) {
  if (body.event !== 'messages.upsert') return null;
  
  const data = body.data;
  if (!data || !data.key || data.key.fromMe) return null;

  const remoteJid = data.key.remoteJid;
  if (remoteJid.endsWith('@g.us')) return null;

  const phoneNumber = remoteJid.split('@')[0];
  const pushName = data.pushName || 'Valued Customer';
  
  let messageText = '';
  const msg = data.message;
  if (!msg) return null;

  if (msg.conversation) {
    messageText = msg.conversation;
  } else if (msg.extendedTextMessage && msg.extendedTextMessage.text) {
    messageText = msg.extendedTextMessage.text;
  } else if (msg.buttonsResponseMessage && msg.buttonsResponseMessage.selectedButtonId) {
    messageText = msg.buttonsResponseMessage.selectedButtonId;
  } else if (msg.listResponseMessage && msg.listResponseMessage.singleSelectReply && msg.listResponseMessage.singleSelectReply.selectedRowId) {
    messageText = msg.listResponseMessage.singleSelectReply.selectedRowId;
  }

  return {
    phoneNumber,
    pushName,
    messageText: messageText.trim(),
    messageId: data.key.id
  };
}

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/admin/config-creds', (req, res) => {
  res.json({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY
  });
});

app.post('/webhook', async (req, res) => {
  res.status(200).send({ status: 'ACK' });

  const incoming = getIncomingMessage(req.body);
  if (!incoming) return;

  const { phoneNumber, pushName, messageText, messageId } = incoming;

  if (messageId) {
    if (processedMessages.has(messageId)) {
      console.log(`[Deduplicator] Ignored duplicate webhook call for message: ${messageId}`);
      return;
    }
    processedMessages.add(messageId);
    setTimeout(() => {
      processedMessages.delete(messageId);
    }, 10000);
  }
  const instanceName = req.body.instance || process.env.EVOLUTION_DEFAULT_INSTANCE;

  try {
    let { data: stateData, error } = await supabase
      .from('bot_state')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Supabase fetch state error:', error);
      return;
    }

    if (!stateData || messageText.toLowerCase() === 'reset' || messageText.toLowerCase() === 'hi' || messageText.toLowerCase() === 'hello') {
      const initialStep = 'LANGUAGE_SELECTION';
      
      const upsertPayload = {
        phone_number: phoneNumber,
        current_step: initialStep,
        lead_form: {},
        updated_at: new Date()
      };

      await supabase.from('bot_state').upsert(upsertPayload);

      const sections = [
        {
          title: "Choose Language",
          rows: [
            { title: "English", description: "Select English Language", rowId: "lang_en" },
            { title: "Hindi / हिंदी", description: "हिंदी भाषा चुनें", rowId: "lang_hi" },
            { title: "Bengali / বাংলা", description: "বাংলা ভাষা নির্বাচন করুন", rowId: "lang_bn" },
            { title: "Marathi / मराठी", description: "मराठी भाषा निवडा", rowId: "lang_mr" }
          ]
        }
      ];

      await sendList(
        phoneNumber,
        "Welcome to RN Valves! Please select your language / भाषा चुनें:",
        "Select Language",
        sections,
        "RN Valves Assistant",
        "Select an option below",
        instanceName
      );
      return;
    }

    const currentStep = stateData.current_step;
    const selectedLanguage = stateData.language || 'English';
    const textDict = locales[selectedLanguage] || locales.English;

    switch (currentStep) {
      case 'LANGUAGE_SELECTION': {
        let lang = '';
        if (messageText === 'lang_en' || messageText.toLowerCase().includes('en') || messageText === '1') lang = 'English';
        else if (messageText === 'lang_hi' || messageText.toLowerCase().includes('hi') || messageText === '2') lang = 'Hindi';
        else if (messageText === 'lang_bn' || messageText.toLowerCase().includes('bn') || messageText === '3') lang = 'Bengali';
        else if (messageText === 'lang_mr' || messageText.toLowerCase().includes('mr') || messageText === '4') lang = 'Marathi';

        if (!lang) {
          await sendText(phoneNumber, "Invalid option. Please choose a language from the list.", instanceName);
          return;
        }

        const dict = locales[lang];
        await supabase.from('bot_state').update({ language: lang, current_step: 'ASSISTANCE_TYPE' }).eq('phone_number', phoneNumber);

        const sections = [
          {
            title: lang === 'English' ? "Assistance Type" : "सहायता का प्रकार",
            rows: [
              { title: lang === 'English' ? "Service" : "सेवा", description: "Get support/service", rowId: "assist_service" },
              { title: lang === 'English' ? "Catalogue" : "कैटलॉग", description: "View our products", rowId: "assist_catalogue" },
              { title: lang === 'English' ? "Price List" : "मूल्य सूची", description: "Get the product price list", rowId: "assist_price" }
            ]
          }
        ];

        await sendList(phoneNumber, dict.assistance, lang === 'English' ? "Assistance" : "सहायता", sections, "RN Valves", "", instanceName);
        break;
      }

      case 'ASSISTANCE_TYPE': {
        let assistance = '';
        if (messageText === 'assist_service' || messageText.toLowerCase().includes('serv') || messageText === '1') assistance = 'Service';
        else if (messageText === 'assist_catalogue' || messageText.toLowerCase().includes('cat') || messageText === '2') assistance = 'Catalogue';
        else if (messageText === 'assist_price' || messageText.toLowerCase().includes('pri') || messageText === '3') assistance = 'Price List';

        if (!assistance) {
          await sendText(phoneNumber, textDict.assistance, instanceName);
          return;
        }

        await supabase.from('bot_state').update({ assistance_type: assistance, current_step: 'BUSINESS_TYPE' }).eq('phone_number', phoneNumber);

        const sections = [
          {
            title: selectedLanguage === 'English' ? "Business Type" : "व्यवसाय का प्रकार",
            rows: [
              { title: selectedLanguage === 'English' ? "Dealer" : "डीलर", description: "", rowId: "biz_dealer" },
              { title: selectedLanguage === 'English' ? "Distributor" : "वितरक", description: "", rowId: "biz_distributor" },
              { title: selectedLanguage === 'English' ? "Retailer" : "फुटकर विक्रेता", description: "", rowId: "biz_retailer" },
              { title: selectedLanguage === 'English' ? "OEM" : "ओईएम", description: "", rowId: "biz_oem" }
            ]
          }
        ];

        await sendList(phoneNumber, textDict.business, selectedLanguage === 'English' ? "Business Type" : "व्यवसाय", sections, "RN Valves", "", instanceName);
        break;
      }

      case 'BUSINESS_TYPE': {
        let biz = '';
        if (messageText === 'biz_dealer' || messageText.toLowerCase().includes('deal') || messageText === '1') biz = 'Dealer';
        else if (messageText === 'biz_distributor' || messageText.toLowerCase().includes('dist') || messageText === '2') biz = 'Distributor';
        else if (messageText === 'biz_retailer' || messageText.toLowerCase().includes('ret') || messageText === '3') biz = 'Retailer';
        else if (messageText === 'biz_oem' || messageText.toLowerCase().includes('oem') || messageText === '4') biz = 'OEM';

        if (!biz) {
          await sendText(phoneNumber, textDict.business, instanceName);
          return;
        }

        await supabase.from('bot_state').update({ business_type: biz, current_step: 'NEXT_ACTION' }).eq('phone_number', phoneNumber);

        const buttons = [
          { type: 'reply', displayText: selectedLanguage === 'English' ? "View Catalogue" : "कैटलॉग देखें", id: "action_catalogue" },
          { type: 'reply', displayText: selectedLanguage === 'English' ? "Call Agent" : "एजेंट को कॉल करें", id: "action_call" }
        ];

        await sendButtons(phoneNumber, textDict.nextAction, buttons, "RN Valves", "", instanceName);
        break;
      }

      case 'NEXT_ACTION': {
        if (messageText === 'action_call' || messageText.toLowerCase().includes('call') || messageText === '2') {
          await sendText(phoneNumber, "Agent Details:\nName: Rr Delval (RN Valves Details)\nPhone: +91 99999 99992", instanceName);
          await supabase.from('bot_state').update({ next_action: 'Call Agent', current_step: 'FORM_NAME' }).eq('phone_number', phoneNumber);
          await sendText(phoneNumber, textDict.formStart, instanceName);
        } else if (messageText === 'action_catalogue' || messageText.toLowerCase().includes('view') || messageText === '1') {
          await supabase.from('bot_state').update({ next_action: 'View Catalogue', current_step: 'PRODUCT_CATEGORIES' }).eq('phone_number', phoneNumber);
          
          const sections = [
            {
              title: selectedLanguage === 'English' ? "Product Categories" : "उत्पाद की श्रेणियाँ",
              rows: [
                { title: "CP Faucets", description: "Chrome plated faucets", rowId: "cat_cp" },
                { title: "PTMT Faucets", description: "Polytetrafluoroethylene faucets", rowId: "cat_ptmt" },
                { title: selectedLanguage === 'English' ? "Other Categories" : "अन्य श्रेणियाँ", description: "", rowId: "cat_other" }
              ]
            }
          ];

          await sendList(phoneNumber, textDict.categories, selectedLanguage === 'English' ? "Categories" : "श्रेणियाँ", sections, "RN Valves", "", instanceName);
        } else {
          await sendText(phoneNumber, textDict.nextAction, instanceName);
        }
        break;
      }

      case 'PRODUCT_CATEGORIES': {
        let category = '';
        if (messageText === 'cat_cp' || messageText.toLowerCase().includes('cp') || messageText === '1') category = 'CP Faucets';
        else if (messageText === 'cat_ptmt' || messageText.toLowerCase().includes('ptmt') || messageText === '2') category = 'PTMT Faucets';
        else if (messageText === 'cat_other' || messageText.toLowerCase().includes('oth') || messageText === '3') category = 'Other';

        if (!category) {
          await sendText(phoneNumber, textDict.categories, instanceName);
          return;
        }

        await supabase.from('bot_state').update({ product_category: category, current_step: 'SUBCATEGORIES' }).eq('phone_number', phoneNumber);

        const buttons = [
          { type: 'reply', displayText: "Aqua", id: "sub_aqua" },
          { type: 'reply', displayText: "Della", id: "sub_della" },
          { type: 'reply', displayText: "Royal", id: "sub_royal" }
        ];

        await sendButtons(phoneNumber, textDict.subcategories, buttons, "RN Valves", "", instanceName);
        break;
      }

      case 'SUBCATEGORIES': {
        let sub = '';
        if (messageText === 'sub_aqua' || messageText.toLowerCase().includes('aqu') || messageText === '1') sub = 'Aqua';
        else if (messageText === 'sub_della' || messageText.toLowerCase().includes('del') || messageText === '2') sub = 'Della';
        else if (messageText === 'sub_royal' || messageText.toLowerCase().includes('roy') || messageText === '3') sub = 'Royal';

        if (!sub) {
          await sendText(phoneNumber, textDict.subcategories, instanceName);
          return;
        }

        await supabase.from('bot_state').update({ subcategory: sub, current_step: 'PRODUCT_INTRO' }).eq('phone_number', phoneNumber);

        const pdfKey = `catalogue_${sub.toLowerCase()}`;
        const imgKey = `intro_image_${sub.toLowerCase()}`;

        const pdfUrl = await getConfigValue(pdfKey, process.env.CATALOGUE_PDF_URL);
        const imgUrl = await getConfigValue(imgKey, process.env.PRODUCT_INTRO_IMAGE_URL);

        await sendText(phoneNumber, selectedLanguage === 'English' ? "Sending catalogue PDF..." : "कैटलॉग पीडीएफ भेजी जा रही है...", instanceName);
        await sendMediaUrl(phoneNumber, pdfUrl, 'document', `RN_Valves_${sub}_Catalogue.pdf`, `${sub} Collection Catalogue`, instanceName);

        const introText = textDict.introCaption.replace('{subcategory}', sub);
        const buttons = [
          { type: 'reply', displayText: selectedLanguage === 'English' ? "Call Now" : "कॉल करें", id: "intro_call" },
          { type: 'reply', displayText: selectedLanguage === 'English' ? "Fill Form" : "विवरण भरें", id: "intro_form" }
        ];

        await sendMediaUrl(phoneNumber, imgUrl, 'image', '', introText, instanceName);
        await sendButtons(phoneNumber, selectedLanguage === 'English' ? "What would you like to do?" : "आप क्या करना चाहेंगे?", buttons, "RN Valves", "", instanceName);
        break;
      }

      case 'PRODUCT_INTRO': {
        if (messageText === 'intro_call' || messageText.toLowerCase().includes('call') || messageText === '1') {
          await sendText(phoneNumber, "Agent Details:\nName: Rr Delval (RN Valves Details)\nPhone: +91 99999 99992", instanceName);
          await supabase.from('bot_state').update({ current_step: 'FORM_NAME' }).eq('phone_number', phoneNumber);
          await sendText(phoneNumber, textDict.formStart, instanceName);
        } else if (messageText === 'intro_form' || messageText.toLowerCase().includes('form') || messageText === '2') {
          await supabase.from('bot_state').update({ current_step: 'FORM_NAME' }).eq('phone_number', phoneNumber);
          await sendText(phoneNumber, textDict.formStart, instanceName);
        } else {
          await sendText(phoneNumber, "Please choose: Call Now or Fill Form", instanceName);
        }
        break;
      }

      case 'FORM_NAME': {
        const form = { ...stateData.lead_form, full_name: messageText };
        await supabase.from('bot_state').update({ lead_form: form, current_step: 'FORM_MOBILE' }).eq('phone_number', phoneNumber);
        await sendText(phoneNumber, textDict.askMobile, instanceName);
        break;
      }

      case 'FORM_MOBILE': {
        const form = { ...stateData.lead_form, mobile_number: messageText };
        await supabase.from('bot_state').update({ lead_form: form, current_step: 'FORM_BUSINESS' }).eq('phone_number', phoneNumber);
        await sendText(phoneNumber, textDict.askBusiness, instanceName);
        break;
      }

      case 'FORM_BUSINESS': {
        const form = { ...stateData.lead_form, business_name: messageText };
        await supabase.from('bot_state').update({ lead_form: form, current_step: 'FORM_CITY' }).eq('phone_number', phoneNumber);
        await sendText(phoneNumber, textDict.askCity, instanceName);
        break;
      }

      case 'FORM_CITY': {
        const form = { ...stateData.lead_form, city: messageText };
        await supabase.from('bot_state').update({ lead_form: form, current_step: 'FORM_STATE' }).eq('phone_number', phoneNumber);
        await sendText(phoneNumber, textDict.askState, instanceName);
        break;
      }

      case 'FORM_STATE': {
        const form = { ...stateData.lead_form, state: messageText };
        await supabase.from('bot_state').update({ lead_form: form, current_step: 'FORM_REQUIREMENT' }).eq('phone_number', phoneNumber);
        await sendText(phoneNumber, textDict.askRequirement, instanceName);
        break;
      }

      case 'FORM_REQUIREMENT': {
        const fullForm = { ...stateData.lead_form, requirement: messageText };
        const stateName = fullForm.state || '';
        const agent = await getAgentForState(stateName);

        const leadPayload = {
          full_name: fullForm.full_name,
          mobile_number: fullForm.mobile_number,
          business_name: fullForm.business_name,
          city: fullForm.city,
          state: fullForm.state,
          requirement: fullForm.requirement,
          assigned_agent: `${agent.name} (${agent.phone})`
        };

        const { error: insertError } = await supabase.from('leads').insert(leadPayload);
        if (insertError) {
          console.error('Error inserting lead to Supabase:', insertError);
        }

        let thankYouText = textDict.thankYou
          .replace('{name}', fullForm.full_name)
          .replace('{agentName}', agent.name)
          .replace('{agentPhone}', agent.phone);

        await sendText(phoneNumber, thankYouText, instanceName);
        await supabase.from('bot_state').delete().eq('phone_number', phoneNumber);
        break;
      }

      default: {
        await supabase.from('bot_state').delete().eq('phone_number', phoneNumber);
        break;
      }
    }

  } catch (err) {
    console.error('Fatal chatbot handler error:', err);
  }
});

app.listen(PORT, () => {
  console.log(`Chatbot service listening on port ${PORT}`);
});
