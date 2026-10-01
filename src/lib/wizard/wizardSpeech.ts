import type { Language } from "@/i18n";

/** Step keys shared conceptually by Party + Sales order wizards */
export type WizardSpeechStep =
  | "customer"
  | "mattress"
  | "warranty"
  | "size"
  | "custom_size"
  | "thickness"
  | "design"
  | "quantity"
  | "basket"
  | "preview"
  | "notes"
  | "delivery";

const PHRASES: Record<WizardSpeechStep, { en: string; hi: string; gu: string }> = {
  customer: {
    en: "Enter customer details.",
    hi: "ग्राहक विवरण दर्ज करें।",
    gu: "ગ્રાહક વિગતો દાખલ કરો.",
  },
  mattress: {
    en: "Select mattress type.",
    hi: "मैट्रेस प्रकार चुनें।",
    gu: "મેટ્રેસ પ્રકાર પસંદ કરો.",
  },
  warranty: {
    en: "Select warranty.",
    hi: "वारंटी चुनें।",
    gu: "વોરંટી પસંદ કરો.",
  },
  size: {
    en: "Select mattress size.",
    hi: "मैट्रेस साइज़ चुनें।",
    gu: "મેટ્રેસ સાઈઝ પસંદ કરો.",
  },
  custom_size: {
    en: "Enter custom length, width and thickness.",
    hi: "कस्टम लंबाई, चौड़ाई और मोटाई दर्ज करें।",
    gu: "કસ્ટમ લંબાઈ, પહોળાઈ અને જાડાઈ દાખલ કરો.",
  },
  thickness: {
    en: "Select mattress thickness.",
    hi: "मैट्रेस मोटाई चुनें।",
    gu: "મેટ્રેસ જાડાઈ પસંદ કરો.",
  },
  design: {
    en: "Select mattress design.",
    hi: "मैट्रेस डिज़ाइन चुनें।",
    gu: "મેટ્રેસ ડિઝાઇન પસંદ કરો.",
  },
  quantity: {
    en: "Select quantity.",
    hi: "मात्रा चुनें।",
    gu: "જથ્થો પસંદ કરો.",
  },
  basket: {
    en: "Review your mattress items. Add another mattress or continue.",
    hi: "अपने मैट्रेस आइटम देखें। एक और जोड़ें या जारी रखें।",
    gu: "તમારા મેટ્રેસ આઇટમ જુઓ. બીજો ઉમેરો અથવા ચાલુ રાખો.",
  },
  preview: {
    en: "Review your order. Submit when ready.",
    hi: "अपना ऑर्डर देखें। तैयार होने पर सबमिट करें।",
    gu: "તમારો ઓર્ડર જુઓ. તૈયાર હોય ત્યારે સબમિટ કરો.",
  },
  notes: {
    en: "Add notes if needed, then continue.",
    hi: "आवश्यक हो तो नोट्स जोड़ें, फिर जारी रखें।",
    gu: "જરૂર હોય તો નોંધ ઉમેરો, પછી ચાલુ રાખો.",
  },
  delivery: {
    en: "Select delivery date if required.",
    hi: "आवश्यक हो तो डिलीवरी तारीख चुनें।",
    gu: "જરૂર હોય તો ડિલિવરી તારીખ પસંદ કરો.",
  },
};

export function phraseForWizardStep(
  step: WizardSpeechStep | string,
  language: Language
): string {
  const pack = PHRASES[step as WizardSpeechStep];
  if (!pack) return "";
  if (language === "hi") return pack.hi;
  if (language === "gu") return pack.gu;
  return pack.en;
}
