require('dotenv').config();
const path = require('path');
const express = require('express');
const axios = require('axios');
const { supabase } = require('./db');
const { sendText, sendButtons, sendList, sendMediaUrl } = require('./api');

const app = express();
app.use(express.json());

const PORT = process.env.BOT_PORT || 3000;

// Set to prevent duplicate webhook processing (e.g. global + instance webhooks)
const processedMessages = new Set();

// 6 Languages dictionary mapping
const locales = {
  English: {
    welcome: "👋 Welcome to RN Valves & Faucets!\nPlease select your preferred language to continue.\n\nक्या आगे बढ़ने के लिए अपनी पसंदीदा भाषा चुनें।",
    greeting: "🙏 Welcome to RN Valves & Faucets!\nWe’re happy to assist you with our products, catalogues and sales support.\n\nFirst, please tell us what you are looking for:",
    personalUse: "🏠 Since you are looking for products for personal use, you can explore and purchase our products directly from our website.\n👉 Visit our website: rnvalves.com",
    businessMenu: "Please select what you would like help with:",
    catalogueMenu: "📚 Please select the product category you are interested in:",
    catalogueSent: "📄 Here is our {category} catalogue. Please have a look at our latest collection.",
    postCatalogue: "What would you like to do next?",
    askPinCode: "📍 Please enter your 6-digit Area PIN Code so we can connect you with the appropriate sales representative.",
    invalidPinCode: "⚠️ Please enter a valid 6-digit PIN Code.\nExample: 110001",
    salesRepIntro: "📞 Here are the contact details of your regional sales representative:",
    askName: "👤 Please enter your name.",
    invalidName: "⚠️ Please enter a valid name.",
    askMobile: "📱 Please enter your 10-digit mobile number.",
    invalidMobile: "⚠️ Your mobile number appears to be invalid.\nPlease share a valid 10-digit mobile number.\nExample: 9876543210",
    askInterestedCategory: "🚰 Which product category are you interested in?",
    leadConfirmation: "✅ Thank you! Your requirement has been successfully submitted.\n\n*Your Details*:\n👤 Name: {{customer_name}}\n📱 Mobile: {{mobile}}\n📍 PIN Code: {{pin_code}}\n🚰 Interested In: {{interested_category}}\n\nOur sales team will contact you shortly.\nThank you for choosing RN Valves & Faucets! 🙏",
    invalidInput: "😊 Sorry, I couldn't understand your request.\nPlease select one of the available options or type a valid question.",
    mainMenuText: "🏠 Main Menu\nPlease select an option to continue."
  },
  Hindi: {
    welcome: "👋 Welcome to RN Valves & Faucets!\nPlease select your preferred language to continue.\n\nकृपया आगे बढ़ने के लिए अपनी पसंदीदा भाषा चुनें।",
    greeting: "🙏 RN Valves & Faucets में आपका स्वागत है!\nहम आपको हमारे products, catalogues और sales assistance के बारे में जानकारी देने में खुशी होगी।\n\nसबसे पहले बताइए, आपकी requirement किसके लिए है?",
    personalUse: "🏠 Personal Use के लिए आप हमारे products सीधे हमारी website से देख और purchase कर सकते हैं।\n👉 हमारी website पर जाएं: rnvalves.com",
    businessMenu: "कृपया चुनें कि आपको किस संबंध में सहायता चाहिए:",
    catalogueMenu: "📚 कृपया उस उत्पाद श्रेणी का चयन करें जिसमें आपकी रुचि है:",
    catalogueSent: "📄 यह हमारा {category} कैटलॉग है। कृपया हमारा नवीनतम संग्रह देखें।",
    postCatalogue: "आप आगे क्या करना चाहेंगे?",
    askPinCode: "📍 कृपया अपना 6-अंकीय एरिया पिन कोड दर्ज करें ताकि हम आपको उचित बिक्री प्रतिनिधि से जोड़ सकें।",
    invalidPinCode: "⚠️ कृपया एक मान्य 6-अंकीय पिन कोड दर्ज करें।\nउदाहरण: 110001",
    salesRepIntro: "📞 यहाँ आपके क्षेत्रीय बिक्री प्रतिनिधि के संपर्क विवरण दिए गए हैं:",
    askName: "👤 कृपया अपना नाम दर्ज करें।",
    invalidName: "⚠️ कृपया एक मान्य नाम दर्ज करें।",
    askMobile: "📱 कृपया अपना 10-अंकीय मोबाइल नंबर दर्ज करें।",
    invalidMobile: "⚠️ आपका मोबाइल नंबर अमान्य प्रतीत होता है।\nकृपया एक मान्य 10-अंकीय मोबाइल नंबर साझा करें।\nउदाहरण: 9876543210",
    askInterestedCategory: "🚰 आप किस उत्पाद श्रेणी में रुचि रखते हैं?",
    leadConfirmation: "✅ धन्यवाद! आपकी आवश्यकता सफलतापूर्वक सबमिट कर दी गई है।\n\n*आपका विवरण*:\n👤 नाम: {{customer_name}}\n📱 मोबाइल: {{mobile}}\n📍 पिन कोड: {{pin_code}}\n🚰 रुचि: {{interested_category}}\n\nहमारी सेल्स टीम जल्द ही आपसे संपर्क करेगी।\nRN Valves & Faucets चुनने के लिए धन्यवाद! 🙏",
    invalidInput: "😊 क्षमा करें, मैं आपका अनुरोध समझ नहीं सका।\nकृपया उपलब्ध विकल्पों में से एक का चयन करें या एक वैध प्रश्न टाइप करें।",
    mainMenuText: "🏠 मुख्य मेनू\nकृपया जारी रखने के लिए एक विकल्प चुनें।"
  },
  Telugu: {
    welcome: "👋 Welcome to RN Valves & Faucets!\nPlease select your preferred language to continue.\n\nकृपया आगे बढ़ने के लिए अपनी पसंदीदा भाषा चुनें।",
    greeting: "🙏 RN Valves & Faucets కి స్వాగతం!\nమా products, catalogues మరియు sales assistance గురించి మీకు సహాయం చేయడానికి మేము ఇక్కడ ఉన్నాము.\n\nముందుగా, మీ అవసరం ఏ కోసం ఉందో ఎంచుకోండి:",
    personalUse: "🏠 వ్యక్తిగత ఉపయోగం కోసం మా ఉత్పత్తులను మీరు నేరుగా మా వెబ్‌సైట్ నుండి చూసి కొనుగోలు చేయవచ్చు.\n👉 మా వెబ్‌సైట్‌ను సందర్శించండి: rnvalves.com",
    businessMenu: "దయచేసి మీకు దేనితో సహాయం కావాలో ఎంచుకోండి:",
    catalogueMenu: "📚 దయచేసి మీకు ఆసక్తి ఉన్న ఉత్పత్తి వర్గాన్ని ఎంచుకోండి:",
    catalogueSent: "📄 ఇది మా {category} కేటలాగ్. దయచేసి మా తాజా సేకరణను చూడండి.",
    postCatalogue: "మీరు తదుపరి ఏమి చేయాలనుకుంటున్నారు?",
    askPinCode: "📍 దయచేసి మీ 6-అంకెల ఏరియా పిన్ కోడ్‌ను నమోదు చేయండి, తద్వారా మేము మిమ్మల్ని తగిన సేల్స్ ప్రతినిధితో కనెక్ట్ చేయవచ్చు.",
    invalidPinCode: "⚠️ దయచేసి సరైన 6-అంకెల పిన్ కోడ్‌ను నమోదు చేయండి.\nఉదాహరణ: 110001",
    salesRepIntro: "📞 మీ ప్రాంతీయ విక్రయ ప్రతినిధి సంప్రదింపు వివరాలు ఇక్కడ ఉన్నాయి:",
    askName: "👤 దయచేసి మీ పేరును నమోదు చేయండి.",
    invalidName: "⚠️ దయచేసి సరైన పేరును నమోదు చేయండి.",
    askMobile: "📱 దయచేసి మీ 10-అంకెల మొబైల్ సంఖ్యను నమోదు చేయండి.",
    invalidMobile: "⚠️ మీ మొబైల్ సంఖ్య చెల్లదు.\nదయచేసి సరైన 10-అంకెల మొబైల్ సంఖ్యను షేర్ చేయండి.\nఉదాహరణ: 9876543210",
    askInterestedCategory: "🚰 మీకు ఏ ఉత్పత్తి వర్గంలో ఆసక్తి ఉంది?",
    leadConfirmation: "✅ ధన్యవాదాలు! మీ అవసరం విజయవంతంగా సమర్పించబడింది.\n\n*మీ వివరాలు*:\n👤 పేరు: {{customer_name}}\n📱 మొబైల్: {{mobile}}\n📍 పిన్ కోడ్: {{pin_code}}\n🚰 ఆసక్తిగల వర్గం: {{interested_category}}\n\nమా సేల్స్ టీమ్ త్వరలోనే మిమ్మల్ని సంప్రదిస్తుంది.\nRN Valves & Faucets ని ఎంచుకున్నందుకు ధన్యవాదాలు! 🙏",
    invalidInput: "😊 క్షమించండి, నేను మీ అభ్యర్థనను అర్థం చేసుకోలేకపోయాను.\nదయచేసి అందుబాటులో ఉన్న ఎంపికలలో ఒకదాన్ని ఎంచుకోండి.",
    mainMenuText: "🏠 ప్రధాన మెనూ\nదయచేసి కొనసాగించడానికి ఒక ఎంపికను ఎంచుకోండి."
  },
  Tamil: {
    welcome: "👋 Welcome to RN Valves & Faucets!\nPlease select your preferred language to continue.\n\nकृपया आगे बढ़ने के लिए अपनी पसंदीदा भाषा चुनें।",
    greeting: "🙏 RN Valves & Faucets-க்கு வரவேற்கிறோம்!\nஎங்கள் products, catalogues மற்றும் sales assistance தொடர்பாக உங்களுக்கு உதவ நாங்கள் தயாராக இருக்கிறோம்.\n\nமுதலில், உங்கள் தேவையைத் தேர்வு செய்யவும்:",
    personalUse: "🏠 தனிப்பட்ட பயன்பாட்டிற்கு எங்கள் தயாரிப்புகளை நீங்கள் நேரடியாக எங்களது இணையதளத்தில் பார்த்து வாங்கலாம்.\n👉 எங்கள் இணையதளத்திற்குச் செல்லவும்: rnvalves.com",
    businessMenu: "உங்களுக்கு எதில் உதவி தேவை என்பதைத் தயவுசெய்து தேர்வு செய்யவும்:",
    catalogueMenu: "📚 நீங்கள் ஆர்வமாக உள்ள தயாரிப்பு வகையைத் தேர்வு செய்யவும்:",
    catalogueSent: "📄 இது எங்களது {category} பட்டியல். எங்களது புதிய சேகரிப்பைப் பார்வையிடவும்.",
    postCatalogue: "அடுத்து நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்?",
    askPinCode: "📍 உங்கள் 6-இலக்க பகுதி பின் குறியீட்டை உள்ளிடவும், இதனால் நாங்கள் உங்களை தகுந்த விற்பனை பிரதிநிதியுடன் இணைக்க முடியும்.",
    invalidPinCode: "⚠️ செல்லுபடியாகும் 6-இலக்க பின் குறியீட்டை உள்ளிடவும்.\nஉதாரணம்: 110001",
    salesRepIntro: "📞 உங்கள் பிராந்திய விற்பனை பிரதிநிதியின் தொடர்பு விவரங்கள் இதோ:",
    askName: "👤 உங்கள் பெயரை உள்ளிடவும்.",
    invalidName: "⚠️ செல்லுபடியாகும் பெயரை உள்ளிடவும்.",
    askMobile: "📱 உங்கள் 10-இலக்க மொபைல் எண்ணை உள்ளிடவும்.",
    invalidMobile: "⚠️ உங்கள் மொபைல் எண் தவறானது.\nசெல்லுபடியாகும் 10-இலக்க மொபைல் எண்ணைப் பகிரவும்.\nஉதாரணம்: 9876543210",
    askInterestedCategory: "🚰 நீங்கள் எந்த தயாரிப்பு பிரிவில் ஆர்வமாக உள்ளீர்கள்?",
    leadConfirmation: "✅ நன்றி! உங்களது தேவை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது.\n\n*உங்கள் விவரங்கள்*:\n👤 பெயர்: {{customer_name}}\n📱 மொபைல்: {{mobile}}\n📍 பின் குறியீடு: {{pin_code}}\n🚰 ஆர்வமுள்ள பிரிவு: {{interested_category}}\n\nஎங்கள் விற்பனைக் குழு விரைவில் உங்களைத் தொடர்பு கொள்ளும்.\nRN Valves & Faucets-ஐத் தேர்ந்தெடுத்ததற்கு நன்றி! 🙏",
    invalidInput: "😊 மன்னிக்கவும், உங்கள் கோரிக்கையை எங்களால் புரிந்து கொள்ள முடியவில்லை.\nதயவுசெய்து கிடைக்கக்கூடிய விருப்பங்களில் ஒன்றைத் தேர்ந்தெடுக்கவும்.",
    mainMenuText: "🏠 முதன்மை மெனு\nதொடர ஒரு விருப்பத்தைத் தேர்ந்தெடுக்கவும்."
  },
  Punjabi: {
    welcome: "👋 Welcome to RN Valves & Faucets!\nPlease select your preferred language to continue.\n\nकृपया आगे बढ़ने के लिए अपनी पसंदीदा भाषा चुनें।",
    greeting: "🙏 RN Valves & Faucets ਵਿੱਚ ਤੁਹਾਡਾ ਸਵਾਗਤ ਹੈ!\nਅਸੀਂ ਤੁਹਾਨੂੰ ਸਾਡੇ products, catalogues ਅਤੇ sales assistance ਬਾਰੇ ਜਾਣਕਾਰੀ ਦੇਣ ਵਿੱਚ ਮਦਦ ਕਰਾਂਗੇ।\n\nਸਭ ਤੋਂ ਪਹਿਲਾਂ ਦੱਸੋ, ਤੁਹਾਡੀ requirement ਕਿਸ ਲਈ ਹੈ?",
    personalUse: "🏠 ਨਿੱਜੀ ਵਰਤੋਂ ਲਈ ਤੁਸੀਂ ਸਾਡੇ ਪ੍ਰੋਡਕਟਸ ਸਿੱਧੇ ਸਾਡੀ ਵੈੱਬਸਾਈਟ ਤੋਂ ਦੇਖ ਅਤੇ ਖਰੀਦ ਸਕਦੇ ਹੋ।\n👉 ਸਾਡੀ ਵੈੱਬਸਾਈਟ 'ਤੇ ਜਾਓ: rnvalves.com",
    businessMenu: "ਕਿਰਪਾ ਕਰਕੇ ਚੁਣੋ ਕਿ ਤੁਹਾਨੂੰ ਕਿਸ ਬਾਰੇ ਸਹਾਇਤਾ ਚਾਹੀਦੀ ਹੈ:",
    catalogueMenu: "📚 ਕਿਰਪਾ ਕਰਕੇ ਉਸ ਪ੍ਰੋਡਕਟ ਕੈਟੇਗਰੀ ਨੂੰ ਚੁਣੋ ਜਿਸ ਵਿੱਚ ਤੁਹਾਡੀ ਦਿਲਚਸਪੀ ਹੈ:",
    catalogueSent: "📄 ਇਹ ਸਾਡੀ {category} ਕੈਟਾਲਾਗ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਸਾਡਾ ਨਵਾਂ ਕਲੈਕਸ਼ਨ ਦੇਖੋ।",
    postCatalogue: "ਤੁਸੀਂ ਅੱਗੇ ਕੀ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    askPinCode: "📍 ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ 6-ਅੰਕਾਂ ਦਾ ਏਰੀਆ ਪਿਨ ਕੋਡ ਦਰਜ ਕਰੋ ਤਾਂ ਜੋ ਅਸੀਂ ਤੁਹਾਨੂੰ ਸਹੀ ਸੇਲਜ਼ ਪ੍ਰਤੀਨਿਧੀ ਨਾਲ ਜੋੜ ਸਕੀਏ।",
    invalidPinCode: "⚠️ ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਸਹੀ 6-ਅੰਕਾਂ ਦਾ ਪਿਨ ਕੋਡ ਦਰਜ ਕਰੋ।\nਉਦਾਹਰਨ: 110001",
    salesRepIntro: "📞 ਇੱਥੇ ਤੁਹਾਡੇ ਖੇਤਰੀ ਸੇਲਜ਼ ਪ੍ਰਤੀਨਿਧੀ ਦੇ ਸੰਪਰਕ ਵੇਰਵੇ ਹਨ:",
    askName: "👤 ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਨਾਮ ਦਰਜ ਕਰੋ।",
    invalidName: "⚠️ ਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਸਹੀ ਨਾਮ ਦਰਜ ਕਰੋ।",
    askMobile: "📱 ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ 10-ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਦਰਜ ਕਰੋ।",
    invalidMobile: "⚠️ ਤੁਹਾਡਾ ਮੋਬਾਈਲ ਨੰਬਰ ਗਲਤ ਲੱਗਦਾ ਹੈ।\nਕਿਰਪਾ ਕਰਕੇ ਇੱਕ ਸਹੀ 10-ਅੰਕਾਂ ਦਾ ਮੋਬਾਈਲ ਨੰਬਰ ਸਾਂਝਾ ਕਰੋ।\nਉਦਾਹਰਨ: 9876543210",
    askInterestedCategory: "🚰 ਤੁਸੀਂ ਕਿਸ ਪ੍ਰੋਡਕਟ ਕੈਟੇਗਰੀ ਵਿੱਚ ਦਿਲਚਸਪੀ ਰੱਖਦੇ ਹੋ?",
    leadConfirmation: "✅ ਧੰਨਵਾਦ! ਤੁਹਾਡੀ requirement ਸਫਲਤਾਪੂਰਵਕ ਸਬਮਿਟ ਹੋ ਗਈ ਹੈ।\n\n*ਤੁਹਾਡਾ ਵੇਰਵਾ*:\n👤 ਨਾਮ: {{customer_name}}\n📱 ਮੋਬਾਈਲ: {{mobile}}\n📍 ਪਿਨ ਕੋਡ: {{pin_code}}\n🚰 ਦਿਲਚਸਪੀ: {{interested_category}}\n\nਸਾਡੀ ਸੇਲਜ਼ ਟੀਮ ਜਲਦੀ ਹੀ ਤੁਹਾਡੇ ਨਾਲ ਸੰਪਰਕ ਕਰੇਗੀ।\nRN Valves & Faucets ਚੁਣਨ ਲਈ ਧੰਨਵਾਦ! 🙏",
    invalidInput: "😊 ਮਾਫ਼ ਕਰਨਾ, ਮੈਂ ਤੁਹਾਡੀ ਬੇਨਤੀ ਨੂੰ ਸਮਝ ਨਹੀਂ ਸਕਿਆ।\nਕਿਰਪਾ ਕਰਕੇ ਉਪਲਬਧ ਵਿਕਲਪਾਂ ਵਿੱਚੋਂ ਇੱਕ ਚੁਣੋ।",
    mainMenuText: "🏠 ਮੁੱਖ ਮੇਨੂ\nਕਿਰਪਾ ਕਰਕੇ ਜਾਰੀ ਰੱਖਣ ਲਈ ਇੱਕ ਵਿਕਲਪ ਚੁਣੋ।"
  },
  Urdu: {
    welcome: "👋 Welcome to RN Valves & Faucets!\nPlease select your preferred language to continue.\n\nकृपया आगे बढ़ने के लिए अपनी पसंदीदा भाषा चुनें।",
    greeting: "🙏 RN Valves & Faucets میں خوش آمدید!\nہم آپ کو اپنے products، catalogues اور sales assistance کے بارے میں معلومات فراہم کرنے میں مدد کریں گے۔\n\nسب سے پہلے بتائیں، آپ کی ضرورت کس لیے ہے؟",
    personalUse: "🏠 ذاتی استعمال کے لیے آپ ہماری پروڈکٹس کو براہ راست ہماری ویب سائٹ پر دیکھ اور خرید سکتے ہیں۔\n👉 ہماری ویب سائٹ پر جائیں: rnvalves.com",
    businessMenu: "براہ کرم منتخب کریں کہ آپ کو کس چیز میں مدد کی ضرورت ہے:",
    catalogueMenu: "📚 براہ کرم اس پروڈکٹ کیٹیگری کو منتخب کریں جس میں آپ کو دلچسپی ہے:",
    catalogueSent: "📄 یہ ہمارا {category} کیٹلاگ ہے۔ براہ کرم ہمارا تازہ ترین مجموعہ دیکھیں۔",
    postCatalogue: "آپ آگے کیا کرنا چاہیں گے؟",
    askPinCode: "📍 براہ کرم اپنا 6 ہندسوں کا ایریا پن کوڈ درج کریں تاکہ ہم آپ کو مناسب سیلز نمائندے سے جوڑ سکیں۔",
    invalidPinCode: "⚠️ براہ کرم ایک درست 6 ہندسوں کا پن کوڈ درج کریں۔\nمثال: 110001",
    salesRepIntro: "📞 یہاں آپ کے علاقائی سیلز نمائندے کے رابطہ کی تفصیلات ہیں:",
    askName: "👤 براہ کرم اپنا نام درج کریں۔",
    invalidName: "⚠️ براہ کرم ایک درست نام درج کریں۔",
    askMobile: "📱 براہ کرم اپنا 10 ہندسوں کا موبائل نمبر درج کریں۔",
    invalidMobile: "⚠️ آپ کا موبائل نمبر غلط معلوم ہوتا ہے۔\nبراہ کرم ایک درست 10 ہندسوں کا موبائل نمبر شیئر کریں۔\nمثال: 9876543210",
    askInterestedCategory: "🚰 آپ کس پروڈکٹ کیٹیگری میں دلچسپی رکھتے ہیں؟",
    leadConfirmation: "✅ شکریہ! آپ کی ضرورت کامیابی کے ساتھ جمع ہو گئی ہے۔\n\n*آپ کی تفصیلات*:\n👤 نام: {{customer_name}}\n📱 موبائل: {{mobile}}\n📍 پن کوڈ: {{pin_code}}\n🚰 دلچسپی: {{interested_category}}\n\nہماری سیلز ٹیم جلد ہی آپ سے رابطہ کرے گی۔\nRN Valves & Faucets منتخب کرنے کے لیے شکریہ! 🙏",
    invalidInput: "😊 معذرت، میں آپ کی درخواست کو سمجھ نہیں سکا۔\nبراہ کرم دستیاب اختیارات میں سے ایک منتخب کریں۔",
    mainMenuText: "🏠 مرکزی مینو\nبراہ کرم جاری رکھنے کے لیے ایک اختیار منتخب کریں۔"
  }
};

const AGENTS = {
  gaurav: { id: 'gaurav', name: 'Gaurav', phoneKey: 'agent_gaurav_phone', fallback: '+91 99999 99991' },
  danish: { id: 'danish', name: 'Danish', phoneKey: 'agent_danish_phone', fallback: '+91 99999 99992' },
  arpita: { id: 'arpita', name: 'Arpita', phoneKey: 'agent_arpita_phone', fallback: '+91 99999 99993' },
  vinod: { id: 'vinod', name: 'Vinod Kumar', phoneKey: 'agent_vinod_phone', fallback: '+91 99999 99994' },
  amit: { id: 'amit', name: 'Amit', phoneKey: 'agent_amit_phone', fallback: '+91 99999 99995' }
};

const CATEGORY_MAP = {
  'CP Faucets': { key: 'catalogue_cp_faucets', imageKey: 'intro_image_cp_faucets', label: 'CP Faucets', fileName: 'CP_Faucets.pdf' },
  'PTMT Faucets': { key: 'catalogue_ptmt_faucets', imageKey: 'intro_image_ptmt_faucets', label: 'PTMT Faucets', fileName: 'PTMT_Faucets.pdf' },
  'Accessories': { key: 'catalogue_accessories', imageKey: 'intro_image_accessories', label: 'Accessories', fileName: 'Accessories.pdf' },
  'Health Faucets': { key: 'catalogue_health_faucets', imageKey: 'intro_image_health_faucets', label: 'Health Faucets', fileName: 'Health_Faucets.pdf' },
  'Showers': { key: 'catalogue_showers', imageKey: 'intro_image_showers', label: 'Showers', fileName: 'Showers.pdf' },
  'Ball Valves': { key: 'catalogue_ball_valves', imageKey: 'intro_image_ball_valves', label: 'Ball Valves', fileName: 'Ball_Valves.pdf' },
  'All Categories': { key: 'catalogue_all_categories', imageKey: 'intro_image_all_categories', label: 'All Categories', fileName: 'Complete_Catalogue.pdf' }
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

async function resolveAgentForState(stateName) {
  const s = (stateName || '').toLowerCase().trim();
  let agentKey = null;

  if (s.includes('rajasthan')) {
    agentKey = 'gaurav';
  } else if (s.includes('kerala') || s.includes('delhi') || s.includes('jammu') || s.includes('kashmir')) {
    agentKey = 'danish';
  } else if (s.includes('uttar pradesh') || s.includes('up') || s.includes('bihar')) {
    agentKey = 'arpita';
  } else if (s.includes('maharashtra') || s.includes('mh') || s.includes('karnataka') || s.includes('ka') || s.includes('madhya pradesh') || s.includes('mp')) {
    agentKey = 'vinod';
  } else if (s.includes('haryana') || s.includes('gujarat') || s.includes('gj') || s.includes('punjab') || s.includes('uttarakhand') || s.includes('himachal')) {
    agentKey = 'amit';
  }

  if (agentKey) {
    const meta = AGENTS[agentKey];
    const phone = await getConfigValue(meta.phoneKey, meta.fallback);
    return { id: meta.id, name: meta.name, phone: phone };
  }

  return null;
}

async function resolvePinCode(pincode) {
  try {
    const res = await axios.get(`https://api.postalpincode.in/pincode/${pincode.trim()}`, { timeout: 5000 });
    if (res.data && res.data[0] && res.data[0].Status === 'Success' && res.data[0].PostOffice) {
      const office = res.data[0].PostOffice[0];
      return {
        area: office.Name || '',
        city: office.Block || office.District || '',
        district: office.District || '',
        state: office.State || ''
      };
    }
  } catch (err) {
    console.error(`Error resolving PIN code ${pincode}:`, err.message);
  }
  return null;
}

// Clean and normalize mobile number
function cleanMobileNumber(number) {
  let cleaned = number.replace(/[\s\-\+\(\)]/g, '');
  if (cleaned.startsWith('91') && cleaned.length > 10) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
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
  
  // Extract from nested data.message or root level data
  const msg = data.message || {};
  const root = data || {};

  const listResponse = msg.listResponseMessage || root.listResponseMessage;
  const buttonResponse = msg.buttonsResponseMessage || root.buttonsResponseMessage || msg.templateButtonReplyMessage || root.templateButtonReplyMessage;
  const extendedText = msg.extendedTextMessage || root.extendedTextMessage;
  const conversation = msg.conversation || root.conversation;

  if (listResponse) {
    if (listResponse.singleSelectReply && listResponse.singleSelectReply.selectedRowId) {
      messageText = listResponse.singleSelectReply.selectedRowId;
    } else if (listResponse.title) {
      messageText = listResponse.title;
    }
  } else if (buttonResponse) {
    messageText = buttonResponse.selectedButtonId || buttonResponse.selectedId || '';
  } else if (extendedText && extendedText.text) {
    messageText = extendedText.text;
  } else if (conversation) {
    messageText = conversation;
  }

  return {
    phoneNumber,
    pushName,
    messageText: messageText.trim(),
    messageId: data.key.id
  };
}

// UI Views mount on Express
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
  console.log("WEBHOOK_BODY:", JSON.stringify(req.body));

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

    const greetingTriggers = ['hi', 'hello', 'hii', 'hey', 'good morning', 'good afternoon', 'good evening', 'start', 'namaste'];
    const isGreeting = greetingTriggers.includes(messageText.toLowerCase().trim());

    // 1. Check if greeting or reset session trigger
    if (!stateData || isGreeting || messageText.toLowerCase() === 'reset') {
      const initialStep = 'LANGUAGE_SELECTION';
      
      const payload = {
        phone_number: phoneNumber,
        current_step: initialStep,
        language: 'English',
        customer_type: null,
        customer_name: null,
        mobile_number: null,
        pin_code: null,
        area: null,
        city: null,
        district: null,
        state: null,
        interested_category: null,
        catalogue_sent: false,
        assigned_agent_id: null,
        assigned_agent_name: null,
        assigned_agent_mobile: null,
        lead_id: null,
        updated_at: new Date()
      };

      await supabase.from('bot_state').upsert(payload);

      // Since there are 6 language buttons, and WhatsApp button templates max is 3, we use sendList
      const sections = [{
        title: 'Languages',
        rows: [
          { title: '🇬🇧 English', rowId: 'lang_English' },
          { title: '🇮🇳 Hindi / हिंदी', rowId: 'lang_Hindi' },
          { title: '🟠 Telugu / తెలుగు', rowId: 'lang_Telugu' },
          { title: '🔴 Tamil / தமிழ்', rowId: 'lang_Tamil' },
          { title: '🟢 Punjabi / ਪੰਜਾਬੀ', rowId: 'lang_Punjabi' },
          { title: '🔵 Urdu / اردو', rowId: 'lang_Urdu' }
        ]
      }];

      await sendList(phoneNumber, locales.English.welcome, 'Select Language', sections, 'RN Valves & Faucets', '', instanceName);
      return;
    }

    const selectedLanguage = stateData.language || 'English';
    const textDict = locales[selectedLanguage] || locales.English;

    // 2. Check global Change Language trigger
    if (messageText === 'global_change_language' || messageText.toLowerCase().includes('change language') || messageText.toLowerCase().includes('भाषा बदलें') || messageText.toLowerCase().includes('மொழி மாற்றம்')) {
      await supabase.from('bot_state').update({ current_step: 'LANGUAGE_SELECTION' }).eq('phone_number', phoneNumber);
      
      const sections = [{
        title: 'Languages',
        rows: [
          { title: '🇬🇧 English', rowId: 'lang_English' },
          { title: '🇮🇳 Hindi / हिंदी', rowId: 'lang_Hindi' },
          { title: '🟠 Telugu / తెలుగు', rowId: 'lang_Telugu' },
          { title: '🔴 Tamil / தமிழ்', rowId: 'lang_Tamil' },
          { title: '🟢 Punjabi / ਪੰਜਾਬੀ', rowId: 'lang_Punjabi' },
          { title: '🔵 Urdu / اردو', rowId: 'lang_Urdu' }
        ]
      }];

      await sendList(phoneNumber, locales.English.welcome, 'Select Language', sections, 'RN Valves & Faucets', '', instanceName);
      return;
    }

    // Helper function to return to Main Menu
    const triggerMainMenu = async () => {
      await supabase.from('bot_state').update({ current_step: 'REQUIREMENT_TYPE' }).eq('phone_number', phoneNumber);
      
      const sections = [{
        title: selectedLanguage === 'English' ? 'Options' : 'विकल्प',
        rows: [
          { title: '🏢 Distributor', rowId: 'req_distributor', description: 'Business Distributor' },
          { title: '🏪 Dealer', rowId: 'req_dealer', description: 'Business Dealer' },
          { title: '🛍️ Retailer', rowId: 'req_retailer', description: 'Business Retailer' },
          { title: '🏠 Personal Use', rowId: 'req_personal', description: 'For Personal Use' },
          { title: selectedLanguage === 'English' ? '🌐 Change Language' : '🌐 भाषा बदलें', rowId: 'global_change_language', description: 'Change language selection' }
        ]
      }];

      await sendList(phoneNumber, textDict.greeting, selectedLanguage === 'English' ? 'Select Type' : 'चयन करें', sections, 'RN Valves', '', instanceName);
    };

    // 3. Check global Main Menu trigger
    if (messageText === 'global_main_menu' || messageText.toLowerCase().trim() === 'main menu' || messageText.trim() === '🏠 Main Menu' || messageText.trim() === '🏠 मुख्य मेनू') {
      await triggerMainMenu();
      return;
    }

    // 4. Conversation state switch
    switch (stateData.current_step) {
      
      case 'LANGUAGE_SELECTION': {
        let lang = '';
        if (messageText.startsWith('lang_')) {
          lang = messageText.replace('lang_', '');
        } else {
          // Plain text fallback matching
          const cleanText = messageText.toLowerCase().trim();
          if (cleanText.includes('english')) lang = 'English';
          else if (cleanText.includes('hindi') || cleanText.includes('हिंदी')) lang = 'Hindi';
          else if (cleanText.includes('telugu') || cleanText.includes('తెలుగు')) lang = 'Telugu';
          else if (cleanText.includes('tamil') || cleanText.includes('தமிழ்')) lang = 'Tamil';
          else if (cleanText.includes('punjabi') || cleanText.includes('ਪੰਜਾਬੀ')) lang = 'Punjabi';
          else if (cleanText.includes('urdu') || cleanText.includes('اردو')) lang = 'Urdu';
        }

        if (!lang || !locales[lang]) {
          // Re-show language menu
          const sections = [{
            title: 'Languages',
            rows: [
              { title: '🇬🇧 English', rowId: 'lang_English' },
              { title: '🇮🇳 Hindi / हिंदी', rowId: 'lang_Hindi' },
              { title: '🟠 Telugu / తెలుగు', rowId: 'lang_Telugu' },
              { title: '🔴 Tamil / தமிழ்', rowId: 'lang_Tamil' },
              { title: '🟢 Punjabi / ਪੰਜਾਬੀ', rowId: 'lang_Punjabi' },
              { title: '🔵 Urdu / اردو', rowId: 'lang_Urdu' }
            ]
          }];
          await sendList(phoneNumber, locales.English.welcome, 'Select Language', sections, 'RN Valves & Faucets', '', instanceName);
          return;
        }

        await supabase.from('bot_state').update({ language: lang, current_step: 'REQUIREMENT_TYPE' }).eq('phone_number', phoneNumber);
        const newDict = locales[lang];

        const sections = [{
          title: lang === 'English' ? 'Options' : 'विकल्प',
          rows: [
            { title: '🏢 Distributor', rowId: 'req_distributor', description: 'Business Distributor' },
            { title: '🏪 Dealer', rowId: 'req_dealer', description: 'Business Dealer' },
            { title: '🛍️ Retailer', rowId: 'req_retailer', description: 'Business Retailer' },
            { title: '🏠 Personal Use', rowId: 'req_personal', description: 'For Personal Use' },
            { title: lang === 'English' ? '🌐 Change Language' : '🌐 भाषा बदलें', rowId: 'global_change_language', description: 'Change language selection' }
          ]
        }];

        await sendList(phoneNumber, newDict.greeting, lang === 'English' ? 'Select Type' : 'चयन करें', sections, 'RN Valves', '', instanceName);
        break;
      }

      case 'REQUIREMENT_TYPE': {
        let type = '';
        if (messageText === 'req_distributor' || messageText.toLowerCase().includes('distributor')) type = 'Distributor';
        else if (messageText === 'req_dealer' || messageText.toLowerCase().includes('dealer')) type = 'Dealer';
        else if (messageText === 'req_retailer' || messageText.toLowerCase().includes('retailer')) type = 'Retailer';
        else if (messageText === 'req_personal' || messageText.toLowerCase().includes('personal')) type = 'Personal Use';

        if (!type) {
          // Gracefully fallback: show invalid error and repeat options
          await sendText(phoneNumber, textDict.invalidInput, instanceName);
          await triggerMainMenu();
          return;
        }

        await supabase.from('bot_state').update({ customer_type: type }).eq('phone_number', phoneNumber);

        if (type === 'Personal Use') {
          await supabase.from('bot_state').update({ current_step: 'PERSONAL_USE_END' }).eq('phone_number', phoneNumber);
          const buttons = [
            { type: 'reply', displayText: '🏠 Main Menu', id: 'global_main_menu' }
          ];
          await sendButtons(phoneNumber, textDict.personalUse, buttons, 'RN Valves & Faucets', '', instanceName);
        } else {
          // Business Customer Flow
          await supabase.from('bot_state').update({ current_step: 'BUSINESS_MENU' }).eq('phone_number', phoneNumber);
          
          const sections = [{
            title: selectedLanguage === 'English' ? 'Business Menu' : 'व्यापार मेनू',
            rows: [
              { title: '📚 Product Catalogues', rowId: 'biz_catalogues', description: 'Explore collection catalog files' },
              { title: '💰 Pricing / Enquiry', rowId: 'biz_pricing', description: 'Enquire about pricing/rates' },
              { title: '📞 Talk to Sales Team', rowId: 'biz_sales', description: 'Connect with a sales agent' },
              { title: '📝 Submit Requirement', rowId: 'biz_requirement', description: 'Submit requirement details' },
              { title: '🏠 Main Menu', rowId: 'global_main_menu', description: 'Return to Main Menu' }
            ]
          }];

          await sendList(phoneNumber, textDict.businessMenu, selectedLanguage === 'English' ? 'Select Action' : 'चयन करें', sections, 'RN Valves', '', instanceName);
        }
        break;
      }

      case 'PERSONAL_USE_END': {
        if (messageText === 'global_main_menu' || messageText.toLowerCase().trim() === 'main menu' || messageText.trim() === '🏠 Main Menu') {
          await triggerMainMenu();
        } else {
          await sendText(phoneNumber, textDict.invalidInput, instanceName);
          const buttons = [
            { type: 'reply', displayText: '🏠 Main Menu', id: 'global_main_menu' }
          ];
          await sendButtons(phoneNumber, textDict.personalUse, buttons, 'RN Valves & Faucets', '', instanceName);
        }
        break;
      }

      case 'BUSINESS_MENU': {
        let action = '';
        if (messageText === 'biz_catalogues' || messageText.toLowerCase().includes('catalog')) action = 'catalogues';
        else if (messageText === 'biz_pricing' || messageText.toLowerCase().includes('pricing') || messageText.toLowerCase().includes('enquiry')) action = 'pricing';
        else if (messageText === 'biz_sales' || messageText.toLowerCase().includes('sales')) action = 'sales';
        else if (messageText === 'biz_requirement' || messageText.toLowerCase().includes('submit')) action = 'requirement';

        if (!action) {
          await sendText(phoneNumber, textDict.invalidInput, instanceName);
          // Repeat options
          const sections = [{
            title: selectedLanguage === 'English' ? 'Business Menu' : 'व्यापार मेनू',
            rows: [
              { title: '📚 Product Catalogues', rowId: 'biz_catalogues' },
              { title: '💰 Pricing / Enquiry', rowId: 'biz_pricing' },
              { title: '📞 Talk to Sales Team', rowId: 'biz_sales' },
              { title: '📝 Submit Requirement', rowId: 'biz_requirement' },
              { title: '🏠 Main Menu', rowId: 'global_main_menu' }
            ]
          }];
          await sendList(phoneNumber, textDict.businessMenu, 'Options', sections, 'RN Valves', '', instanceName);
          return;
        }

        if (action === 'catalogues') {
          await supabase.from('bot_state').update({ current_step: 'PRODUCT_CATALOGUES' }).eq('phone_number', phoneNumber);
          const sections = [{
            title: selectedLanguage === 'English' ? 'Categories' : 'श्रेणियाँ',
            rows: [
              { title: '🚰 CP Faucets', rowId: 'cat_CP Faucets' },
              { title: '💧 PTMT Faucets', rowId: 'cat_PTMT Faucets' },
              { title: '🔧 Accessories', rowId: 'cat_Accessories' },
              { title: '🚿 Health Faucets', rowId: 'cat_Health Faucets' },
              { title: '🚿 Showers', rowId: 'cat_Showers' },
              { title: '⚙️ Ball Valves', rowId: 'cat_Ball Valves' },
              { title: '📖 All Categories', rowId: 'cat_All Categories' },
              { title: '🏠 Main Menu', rowId: 'global_main_menu' }
            ]
          }];
          await sendList(phoneNumber, textDict.catalogueMenu, 'Select Category', sections, 'RN Valves', '', instanceName);
        } else if (action === 'sales' || action === 'pricing') {
          // If PIN is already known in session, resolve immediately
          if (stateData.pin_code && stateData.pin_code.length === 6) {
            const agent = await resolveAgentForState(stateData.state);
            if (agent) {
              await supabase.from('bot_state').update({ 
                current_step: 'SALES_REP_SHOWN',
                assigned_agent_id: agent.id,
                assigned_agent_name: agent.name,
                assigned_agent_mobile: agent.phone
              }).eq('phone_number', phoneNumber);

              const repText = `${textDict.salesRepIntro}\n\n👤 *Name*: ${agent.name}\n📱 *Mobile*: ${agent.phone}\n📍 *Area*: ${stateData.area || 'N/A'}\n🗺️ *State*: ${stateData.state || 'N/A'}`;
              const buttons = [
                { type: 'reply', displayText: '🏠 Main Menu', id: 'global_main_menu' },
                { type: 'reply', displayText: '📝 Submit Requirement', id: 'biz_requirement' }
              ];
              await sendButtons(phoneNumber, repText, buttons, 'RN Valves & Faucets', '', instanceName);
              return;
            }
          }
          // Request PIN code
          await supabase.from('bot_state').update({ current_step: 'SALES_PIN_CODE' }).eq('phone_number', phoneNumber);
          await sendText(phoneNumber, textDict.askPinCode, instanceName);
        } else if (action === 'requirement') {
          await supabase.from('bot_state').update({ current_step: 'FORM_NAME' }).eq('phone_number', phoneNumber);
          await sendText(phoneNumber, textDict.askName, instanceName);
        }
        break;
      }

      case 'PRODUCT_CATALOGUES': {
        let selectedCat = '';
        if (messageText.startsWith('cat_')) {
          selectedCat = messageText.replace('cat_', '');
        } else {
          // Fallback text match
          const cleanText = messageText.toLowerCase().trim();
          Object.keys(CATEGORY_MAP).forEach(k => {
            if (cleanText.includes(k.toLowerCase())) selectedCat = k;
          });
        }

        const mapMeta = CATEGORY_MAP[selectedCat];
        if (!mapMeta) {
          await sendText(phoneNumber, textDict.invalidInput, instanceName);
          // Reshow categories
          const sections = [{
            title: 'Categories',
            rows: [
              { title: '🚰 CP Faucets', rowId: 'cat_CP Faucets' },
              { title: '💧 PTMT Faucets', rowId: 'cat_PTMT Faucets' },
              { title: '🔧 Accessories', rowId: 'cat_Accessories' },
              { title: '🚿 Health Faucets', rowId: 'cat_Health Faucets' },
              { title: '🚿 Showers', rowId: 'cat_Showers' },
              { title: '⚙️ Ball Valves', rowId: 'cat_Ball Valves' },
              { title: '📖 All Categories', rowId: 'cat_All Categories' },
              { title: '🏠 Main Menu', rowId: 'global_main_menu' }
            ]
          }];
          await sendList(phoneNumber, textDict.catalogueMenu, 'Select Category', sections, 'RN Valves', '', instanceName);
          return;
        }

        // Fetch dynamic URLs
        const pdfUrl = await getConfigValue(mapMeta.key, '');
        const imgUrl = await getConfigValue(mapMeta.imageKey, '');

        await supabase.from('bot_state').update({ 
          current_step: 'POST_CATALOGUE',
          interested_category: selectedCat,
          catalogue_sent: true
        }).eq('phone_number', phoneNumber);

        const captionText = textDict.catalogueSent.replace('{category}', mapMeta.label);
        
        // 1. Send PDF catalogue file
        if (pdfUrl) {
          await sendText(phoneNumber, selectedLanguage === 'English' ? "Sending catalogue PDF..." : "कैटलॉग पीडीएफ भेजी जा रही है...", instanceName);
          await sendMediaUrl(phoneNumber, pdfUrl, 'document', mapMeta.fileName, captionText, instanceName);
        } else {
          await sendText(phoneNumber, captionText, instanceName);
        }

        // 2. Send Showcase image optionally if uploaded
        if (imgUrl) {
          await sendMediaUrl(phoneNumber, imgUrl, 'image', '', captionText, instanceName);
        }

        // 3. Send action List options
        const sections = [{
          title: selectedLanguage === 'English' ? 'Next Actions' : 'अगली कार्रवाई',
          rows: [
            { title: '📞 Talk to Sales Team', rowId: 'biz_sales', description: 'Connect with a sales agent' },
            { title: '📝 Submit Requirement', rowId: 'biz_requirement', description: 'Submit requirement details' },
            { title: '📚 View Other Categories', rowId: 'biz_catalogues', description: 'Return to catalogue selection' },
            { title: '🏠 Main Menu', rowId: 'global_main_menu', description: 'Return to Main Menu' }
          ]
        }];

        await sendList(phoneNumber, textDict.postCatalogue, 'Select Option', sections, 'RN Valves', '', instanceName);
        break;
      }

      case 'POST_CATALOGUE': {
        let nextAct = '';
        if (messageText === 'biz_sales' || messageText.toLowerCase().includes('sales')) nextAct = 'sales';
        else if (messageText === 'biz_requirement' || messageText.toLowerCase().includes('submit') || messageText.toLowerCase().includes('requirement')) nextAct = 'requirement';
        else if (messageText === 'biz_catalogues' || messageText.toLowerCase().includes('other categories') || messageText.toLowerCase().includes('view')) nextAct = 'catalogues';

        if (!nextAct) {
          await sendText(phoneNumber, textDict.invalidInput, instanceName);
          // Reshow post catalogue actions
          const sections = [{
            title: 'Next Actions',
            rows: [
              { title: '📞 Talk to Sales Team', rowId: 'biz_sales' },
              { title: '📝 Submit Requirement', rowId: 'biz_requirement' },
              { title: '📚 View Other Categories', rowId: 'biz_catalogues' },
              { title: '🏠 Main Menu', rowId: 'global_main_menu' }
            ]
          }];
          await sendList(phoneNumber, textDict.postCatalogue, 'Select Option', sections, 'RN Valves', '', instanceName);
          return;
        }

        if (nextAct === 'catalogues') {
          await supabase.from('bot_state').update({ current_step: 'PRODUCT_CATALOGUES' }).eq('phone_number', phoneNumber);
          const sections = [{
            title: 'Categories',
            rows: [
              { title: '🚰 CP Faucets', rowId: 'cat_CP Faucets' },
              { title: '💧 PTMT Faucets', rowId: 'cat_PTMT Faucets' },
              { title: '🔧 Accessories', rowId: 'cat_Accessories' },
              { title: '🚿 Health Faucets', rowId: 'cat_Health Faucets' },
              { title: '🚿 Showers', rowId: 'cat_Showers' },
              { title: '⚙️ Ball Valves', rowId: 'cat_Ball Valves' },
              { title: '📖 All Categories', rowId: 'cat_All Categories' },
              { title: '🏠 Main Menu', rowId: 'global_main_menu' }
            ]
          }];
          await sendList(phoneNumber, textDict.catalogueMenu, 'Select Category', sections, 'RN Valves', '', instanceName);
        } else if (nextAct === 'sales') {
          if (stateData.pin_code && stateData.pin_code.length === 6) {
            const agent = await resolveAgentForState(stateData.state);
            if (agent) {
              await supabase.from('bot_state').update({ 
                current_step: 'SALES_REP_SHOWN',
                assigned_agent_id: agent.id,
                assigned_agent_name: agent.name,
                assigned_agent_mobile: agent.phone
              }).eq('phone_number', phoneNumber);

              const repText = `${textDict.salesRepIntro}\n\n👤 *Name*: ${agent.name}\n📱 *Mobile*: ${agent.phone}\n📍 *Area*: ${stateData.area || 'N/A'}\n🗺️ *State*: ${stateData.state || 'N/A'}`;
              const buttons = [
                { type: 'reply', displayText: '🏠 Main Menu', id: 'global_main_menu' },
                { type: 'reply', displayText: '📝 Submit Requirement', id: 'biz_requirement' }
              ];
              await sendButtons(phoneNumber, repText, buttons, 'RN Valves & Faucets', '', instanceName);
              return;
            }
          }
          await supabase.from('bot_state').update({ current_step: 'SALES_PIN_CODE' }).eq('phone_number', phoneNumber);
          await sendText(phoneNumber, textDict.askPinCode, instanceName);
        } else if (nextAct === 'requirement') {
          await supabase.from('bot_state').update({ current_step: 'FORM_NAME' }).eq('phone_number', phoneNumber);
          await sendText(phoneNumber, textDict.askName, instanceName);
        }
        break;
      }

      case 'SALES_PIN_CODE': {
        const pin = messageText.replace(/\s/g, '');
        if (!/^\d{6}$/.test(pin)) {
          await sendText(phoneNumber, textDict.invalidPinCode, instanceName);
          return;
        }

        await sendText(phoneNumber, selectedLanguage === 'English' ? "Locating your region..." : "आपका क्षेत्र खोजा जा रहा है...", instanceName);
        const resolved = await resolvePinCode(pin);

        if (!resolved) {
          // If public API fails, save PIN only, default agent to Danish
          const defaultAgent = await resolveAgentForState('Delhi');
          await supabase.from('bot_state').update({ 
            current_step: 'SALES_REP_SHOWN',
            pin_code: pin,
            assigned_agent_id: defaultAgent.id,
            assigned_agent_name: defaultAgent.name,
            assigned_agent_mobile: defaultAgent.phone
          }).eq('phone_number', phoneNumber);

          const repText = `${textDict.salesRepIntro}\n\n👤 *Name*: ${defaultAgent.name}\n📱 *Mobile*: ${defaultAgent.phone}\n📍 *PIN Code*: ${pin}`;
          const buttons = [
            { type: 'reply', displayText: '🏠 Main Menu', id: 'global_main_menu' },
            { type: 'reply', displayText: '📝 Submit Requirement', id: 'biz_requirement' }
          ];
          await sendButtons(phoneNumber, repText, buttons, 'RN Valves & Faucets', '', instanceName);
          return;
        }

        // Save derived location data
        const agent = await resolveAgentForState(resolved.state);
        
        if (agent) {
          await supabase.from('bot_state').update({ 
            current_step: 'SALES_REP_SHOWN',
            pin_code: pin,
            area: resolved.area,
            city: resolved.city,
            district: resolved.district,
            state: resolved.state,
            assigned_agent_id: agent.id,
            assigned_agent_name: agent.name,
            assigned_agent_mobile: agent.phone
          }).eq('phone_number', phoneNumber);

          const repText = `${textDict.salesRepIntro}\n\n👤 *Name*: ${agent.name}\n📱 *Mobile*: ${agent.phone}\n📍 *Area*: ${resolved.area}\n🗺️ *State*: ${resolved.state}`;
          const buttons = [
            { type: 'reply', displayText: '🏠 Main Menu', id: 'global_main_menu' },
            { type: 'reply', displayText: '📝 Submit Requirement', id: 'biz_requirement' }
          ];
          await sendButtons(phoneNumber, repText, buttons, 'RN Valves & Faucets', '', instanceName);
        } else {
          // No mapped agent for State
          await supabase.from('bot_state').update({ 
            current_step: 'SALES_REP_SHOWN',
            pin_code: pin,
            area: resolved.area,
            city: resolved.city,
            district: resolved.district,
            state: resolved.state,
            assigned_agent_id: null,
            assigned_agent_name: 'Unassigned Support',
            assigned_agent_mobile: ''
          }).eq('phone_number', phoneNumber);

          const repText = `${selectedLanguage === 'English' ? '✅ Area resolved successfully. No specific sales representative mapped for this region. Our support team will contact you shortly.' : '✅ क्षेत्र सफलतापूर्वक मिल गया है। इस क्षेत्र के लिए कोई सेल्स एजेंट मैप नहीं है। हमारी टीम जल्द ही आपसे संपर्क करेगी।'}\n\n📍 *PIN Code*: ${pin}\n🗺️ *State*: ${resolved.state}`;
          const buttons = [
            { type: 'reply', displayText: '🏠 Main Menu', id: 'global_main_menu' },
            { type: 'reply', displayText: '📝 Submit Requirement', id: 'biz_requirement' }
          ];
          await sendButtons(phoneNumber, repText, buttons, 'RN Valves & Faucets', '', instanceName);
        }
        break;
      }

      case 'SALES_REP_SHOWN': {
        let action = '';
        if (messageText === 'biz_requirement' || messageText.toLowerCase().includes('submit') || messageText.toLowerCase().includes('requirement')) action = 'requirement';

        if (action === 'requirement') {
          await supabase.from('bot_state').update({ current_step: 'FORM_NAME' }).eq('phone_number', phoneNumber);
          await sendText(phoneNumber, textDict.askName, instanceName);
        } else {
          await sendText(phoneNumber, textDict.invalidInput, instanceName);
        }
        break;
      }

      case 'FORM_NAME': {
        // Name validation (only alphabetic characters and spaces allowed)
        if (!/^[a-zA-Z\s]{2,50}$/.test(messageText)) {
          await sendText(phoneNumber, textDict.invalidName, instanceName);
          return;
        }

        await supabase.from('bot_state').update({ 
          customer_name: messageText,
          current_step: 'FORM_MOBILE'
        }).eq('phone_number', phoneNumber);

        await sendText(phoneNumber, textDict.askMobile, instanceName);
        break;
      }

      case 'FORM_MOBILE': {
        const cleanedMobile = cleanMobileNumber(messageText);
        if (!/^\d{10}$/.test(cleanedMobile)) {
          await sendText(phoneNumber, textDict.invalidMobile, instanceName);
          return;
        }

        await supabase.from('bot_state').update({ 
          mobile_number: cleanedMobile,
          current_step: 'FORM_PIN_CODE'
        }).eq('phone_number', phoneNumber);

        await sendText(phoneNumber, textDict.askPinCode, instanceName);
        break;
      }

      case 'FORM_PIN_CODE': {
        const pin = messageText.replace(/\s/g, '');
        if (!/^\d{6}$/.test(pin)) {
          await sendText(phoneNumber, textDict.invalidPinCode, instanceName);
          return;
        }

        await sendText(phoneNumber, selectedLanguage === 'English' ? "Locating PIN details..." : "पिन विवरण खोजा जा रहा है...", instanceName);
        const resolved = await resolvePinCode(pin);

        const locationPayload = {
          pin_code: pin,
          current_step: 'FORM_INTEREST'
        };

        if (resolved) {
          locationPayload.area = resolved.area;
          locationPayload.city = resolved.city;
          locationPayload.district = resolved.district;
          locationPayload.state = resolved.state;
        } else {
          locationPayload.area = '';
          locationPayload.city = '';
          locationPayload.district = '';
          locationPayload.state = '';
        }

        await supabase.from('bot_state').update(locationPayload).eq('phone_number', phoneNumber);

        // Show product interest list
        const sections = [{
          title: selectedLanguage === 'English' ? 'Product Interest' : 'रुचि',
          rows: [
            { title: '🚰 CP Faucets', rowId: 'interest_CP Faucets' },
            { title: '💧 PTMT Faucets', rowId: 'interest_PTMT Faucets' },
            { title: '🔧 Accessories', rowId: 'interest_Accessories' },
            { title: '🚿 Health Faucets', rowId: 'interest_Health Faucets' },
            { title: '🚿 Showers', rowId: 'interest_Showers' },
            { title: '⚙️ Ball Valves', rowId: 'interest_Ball Valves' },
            { title: '⭐ All Categories', rowId: 'interest_All Categories' },
            { title: '🏠 Main Menu', rowId: 'global_main_menu' }
          ]
        }];

        await sendList(phoneNumber, textDict.askInterestedCategory, 'Select Category', sections, 'RN Valves', '', instanceName);
        break;
      }

      case 'FORM_INTEREST': {
        let selectedInterest = '';
        if (messageText.startsWith('interest_')) {
          selectedInterest = messageText.replace('interest_', '');
        } else {
          // Fallback text match
          const cleanText = messageText.toLowerCase().trim();
          Object.keys(CATEGORY_MAP).forEach(k => {
            if (cleanText.includes(k.toLowerCase())) selectedInterest = k;
          });
        }

        if (!selectedInterest || !CATEGORY_MAP[selectedInterest]) {
          await sendText(phoneNumber, textDict.invalidInput, instanceName);
          // Reshow list
          const sections = [{
            title: 'Product Interest',
            rows: [
              { title: '🚰 CP Faucets', rowId: 'interest_CP Faucets' },
              { title: '💧 PTMT Faucets', rowId: 'interest_PTMT Faucets' },
              { title: '🔧 Accessories', rowId: 'interest_Accessories' },
              { title: '🚿 Health Faucets', rowId: 'interest_Health Faucets' },
              { title: '🚿 Showers', rowId: 'interest_Showers' },
              { title: '⚙️ Ball Valves', rowId: 'interest_Ball Valves' },
              { title: '⭐ All Categories', rowId: 'interest_All Categories' },
              { title: '🏠 Main Menu', rowId: 'global_main_menu' }
            ]
          }];
          await sendList(phoneNumber, textDict.askInterestedCategory, 'Select Category', sections, 'RN Valves', '', instanceName);
          return;
        }

        // 1. Resolve agent
        const agent = await resolveAgentForState(stateData.state);

        // 2. Build lead details and insert into Supabase
        const leadPayload = {
          customer_name: stateData.customer_name,
          mobile_number: stateData.mobile_number,
          pin_code: stateData.pin_code,
          area: stateData.area || '',
          city: stateData.city || '',
          district: stateData.district || '',
          state: stateData.state || '',
          customer_type: stateData.customer_type,
          interested_category: selectedInterest,
          language: selectedLanguage,
          lead_source: 'WhatsApp Chatbot',
          assigned_agent_id: agent ? agent.id : null,
          assigned_agent_name: agent ? agent.name : 'Unassigned Support',
          assigned_agent_mobile: agent ? agent.phone : '',
          status: agent ? 'New' : 'Unassigned'
        };

        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .insert(leadPayload)
          .select()
          .single();

        if (leadError) {
          console.error('Error inserting lead to Supabase:', leadError);
        }

        // 3. Send confirmation message
        let confMessage = textDict.leadConfirmation
          .replace('{{customer_name}}', stateData.customer_name)
          .replace('{{mobile}}', stateData.mobile_number)
          .replace('{{pin_code}}', stateData.pin_code)
          .replace('{{interested_category}}', selectedInterest);

        await sendText(phoneNumber, confMessage, instanceName);

        // 4. Send complete catalogue if interested in All Categories
        if (selectedInterest === 'All Categories') {
          const mapMeta = CATEGORY_MAP['All Categories'];
          const pdfUrl = await getConfigValue(mapMeta.key, '');
          if (pdfUrl) {
            await sendText(phoneNumber, selectedLanguage === 'English' ? "Sending Complete Catalogue..." : "कम्प्लीट कैटलॉग भेजा जा रहा है...", instanceName);
            await sendMediaUrl(phoneNumber, pdfUrl, 'document', mapMeta.fileName, mapMeta.label, instanceName);
          }
        }

        // 5. Send assigned agent contact details
        if (agent) {
          const repMsg = `${textDict.salesRepIntro}\n\n👤 *Name*: ${agent.name}\n📱 *Mobile*: ${agent.phone}\n📍 *Area*: ${stateData.area || 'N/A'}\n🗺️ *State*: ${stateData.state || 'N/A'}`;
          await sendText(phoneNumber, repMsg, instanceName);
        } else {
          const unassignedMsg = selectedLanguage === 'English' 
            ? "Our support team will contact you shortly to process your request." 
            : "हमारी सहायता टीम आपके अनुरोध पर कार्रवाई करने के लिए जल्द ही आपसे संपर्क करेगी।";
          await sendText(phoneNumber, unassignedMsg, instanceName);
        }

        // 6. Reset current step to main menu and preserve language & verified mobile number
        await supabase.from('bot_state').update({
          current_step: 'REQUIREMENT_TYPE',
          customer_type: null,
          customer_name: null,
          pin_code: null,
          area: null,
          city: null,
          district: null,
          state: null,
          interested_category: null,
          catalogue_sent: false,
          assigned_agent_id: null,
          assigned_agent_name: null,
          assigned_agent_mobile: null,
          lead_id: null
        }).eq('phone_number', phoneNumber);

        // Send Main Menu button prompt
        const buttons = [
          { type: 'reply', displayText: '🏠 Main Menu', id: 'global_main_menu' }
        ];
        await sendButtons(phoneNumber, textDict.mainMenuText, buttons, 'RN Valves & Faucets', '', instanceName);
        break;
      }

      default: {
        await triggerMainMenu();
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
