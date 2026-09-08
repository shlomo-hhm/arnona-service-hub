import { useState } from 'react';
import { X, ChevronRight, TriangleAlert } from 'lucide-react';
import type { Service } from '../data/forms';
import { ServiceGrid } from './ServiceGrid';

interface WizardOption {
  label: string;
  emoji?: string;
  next?: WizardStep;
  resultIds?: string[];
  appealWarning?: boolean;
}

interface WizardStep {
  question: string;
  options: WizardOption[];
}

// Step trees are driven purely by service ids — no assumptions baked
// into components beyond this data structure, so future domains can
// ship their own wizard config without touching the Wizard component.
const discountStep: WizardStep = {
  question: 'מה הסיבה המרכזית?',
  options: [
    { label: 'הכנסה נמוכה', resultIds: ['income-discount'] },
    {
      label: 'אזרח ותיק',
      resultIds: ['senior-25-discount', 'senior-30-discount', 'senior-disabled-100'],
    },
    { label: 'נכות', resultIds: ['medical-disability-discount'] },
    { label: 'ילד עם נכות', resultIds: ['disabled-child-discount'] },
    { label: 'הורה עצמאי', resultIds: ['single-parent-discount'] },
    { label: 'מילואים', resultIds: ['reserve-duty-discount'] },
    { label: 'חייל', resultIds: ['soldier-discount'] },
    { label: 'חייל משוחרר', resultIds: ['released-soldier-discount'] },
    { label: 'שירות לאומי', resultIds: ['national-service-discount'] },
    { label: 'עולה חדש', resultIds: ['new-immigrant-discounts'] },
    { label: 'לא יודע', resultIds: ['smart-discounts', 'discount-criteria'] },
  ],
};

const billingProblemStep: WizardStep = {
  question: 'מה הבעיה?',
  options: [
    { label: 'שטח הנכס לא נכון', resultIds: ['arnona-objection'] },
    { label: 'סיווג לא נכון', resultIds: ['arnona-objection'] },
    { label: 'אני לא המחזיק', resultIds: ['arnona-objection', 'holders-exchange'] },
    {
      label: 'חיוב שאני רוצה לערער עליו',
      resultIds: ['arnona-appeal-form', 'arnona-objection'],
      appealWarning: true,
    },
    { label: 'שאלה כללית', resultIds: ['residential-arnona-inquiry'] },
  ],
};

const rootStep: WizardStep = {
  question: 'מה התושב רוצה לעשות?',
  options: [
    { label: 'עבר דירה / נכנס או יצא מנכס', emoji: '🏠', resultIds: ['holders-exchange'] },
    { label: 'רוצה הנחה', emoji: '💰', next: discountStep },
    {
      label: 'רוצה לשלם',
      emoji: '💳',
      resultIds: ['arnona-payment', 'standing-order-bank', 'standing-order-credit', 'bank-transfer'],
    },
    {
      label: 'צריך אישור',
      emoji: '📄',
      resultIds: ['arnona-certificates', 'tabo-no-debt', 'discount-certificate', 'asset-holding-certificate'],
    },
    { label: 'יש בעיה בחשבון', emoji: '❓', next: billingProblemStep },
    {
      label: 'רוצה לערער על חיוב',
      emoji: '⚖️',
      resultIds: ['arnona-appeal-form', 'arnona-objection'],
      appealWarning: true,
    },
    { label: 'הנכס ריק / לא ראוי לשימוש', emoji: '🏚️', resultIds: ['empty-property', 'arnona-objection'] },
    { label: 'רוצה לבדוק בקשה קיימת', emoji: '🔎', resultIds: ['request-status'] },
    { label: 'מדובר בעסק', emoji: '🏢', resultIds: ['assessment-inquiry'] },
  ],
};

interface WizardProps {
  allServices: Service[];
  onClose: () => void;
  favoriteIds: string[];
  onToggleFavorite: (id: string) => void;
  onOpen: (service: Service) => void;
}

export function Wizard({
  allServices,
  onClose,
  favoriteIds,
  onToggleFavorite,
  onOpen,
}: WizardProps) {
  const [history, setHistory] = useState<WizardStep[]>([rootStep]);
  const [result, setResult] = useState<WizardOption | null>(null);

  const currentStep = history[history.length - 1];

  function selectOption(option: WizardOption) {
    if (option.next) {
      setHistory((h) => [...h, option.next!]);
    } else {
      setResult(option);
    }
  }

  function goBack() {
    if (result) {
      setResult(null);
      return;
    }
    setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h));
  }

  const canGoBack = result !== null || history.length > 1;

  const resultServices = result
    ? result.resultIds
        ?.map((id) => allServices.find((s) => s.id === id))
        .filter((s): s is Service => Boolean(s)) ?? []
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-black/5 p-4">
          <div className="flex items-center gap-2">
            {canGoBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label="חזרה לשאלה הקודמת"
                className="flex h-[44px] w-[44px] items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-2"
              >
                <ChevronRight className="h-5 w-5 text-ink/60" aria-hidden="true" />
              </button>
            )}
            <h2 id="wizard-title" className="text-lg font-bold text-ink">
              לא בטוח איזה טופס צריך?
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="סגירה"
            className="flex h-[44px] w-[44px] items-center justify-center rounded-full hover:bg-black/5 focus-visible:outline-2"
          >
            <X className="h-5 w-5 text-ink/60" aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          {!result ? (
            <>
              <p className="mb-4 text-base font-semibold text-ink">
                {currentStep.question}
              </p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {currentStep.options.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => selectOption(option)}
                    className="flex min-h-[44px] items-center gap-3 rounded-xl border border-black/5 bg-background px-4 py-3 text-start text-sm font-semibold text-ink transition-colors hover:bg-primary/10 focus-visible:outline-2"
                  >
                    {option.emoji && <span aria-hidden="true">{option.emoji}</span>}
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {result.appealWarning && (
                <div className="mb-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    ערר מיועד למקרה שבו כבר הוגשה השגה והתקבלה החלטה. אם עדיין לא הוגשה
                    השגה — יש להתחיל שם.
                  </span>
                </div>
              )}
              <p className="mb-4 text-sm text-ink/60">השירותים המומלצים:</p>
              <ServiceGrid
                services={resultServices}
                favoriteIds={favoriteIds}
                onToggleFavorite={onToggleFavorite}
                onOpen={onOpen}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
