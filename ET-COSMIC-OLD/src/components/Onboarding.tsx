import { useState } from "react";

interface OnboardingProps {
  onClose?: () => void;
}

export default function Onboarding({ onClose }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const steps = [
    {
      title: "Bem-vindo ao ETΞRNET",
      desc: "Você acaba de entrar em uma infraestrutura de soberania total. Aqui, você é o seu próprio banco e sua comunicação é invisível.",
      action: "EXPLORAR",
    },
    {
      title: "Identidade Efêmera",
      desc: "Clique em 'DESPERTAR GHOSTID' no Terminal. Suas chaves são geradas em RAM e destruídas ao fechar a aba. Sem rastro, sem disco.",
      action: "ENTENDI",
    },
    {
      title: "Comunicação Fantasma",
      desc: "Suas mensagens são divididas em pedaços (shards QEL) e viajam por Bluetooth e WebRTC. Ninguém intercepta a mensagem completa.",
      action: "PROSSEGUIR",
    },
    {
      title: "Economia Real",
      desc: "Tokenize bens físicos, crie moedas estáveis locais e troque na DEX sem que ninguém veja o preço total. Soberania Financeira.",
      action: "INICIAR SESSÃO",
    }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
      <div className="max-w-lg w-full bg-[#0a0d10] border border-[#b6ff3a]/30 p-10 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#b6ff3a] to-[#ff3ad9]" />
        
        <div className="mb-8">
          <div className="text-[10px] font-mono text-[#b6ff3a] mb-2 uppercase tracking-[0.3em]">Tutorial de Soberania · 0{step + 1}</div>
          <h2 className="text-3xl font-sans font-light text-white mb-4">{steps[step]?.title}</h2>
          <p className="text-zinc-500 text-lg leading-relaxed">{steps[step]?.desc}</p>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {steps.map((_, i) => (
              <div key={i} className={`size-1.5 rounded-full ${i === step ? "bg-[#b6ff3a]" : "bg-zinc-800"}`} />
            ))}
          </div>
          <button 
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else handleClose();
            }}
            className="px-8 py-3 bg-[#b6ff3a] text-black font-sans font-bold text-xs tracking-widest hover:bg-white transition-smooth"
          >
            {steps[step]?.action}
          </button>
        </div>

        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-zinc-700 hover:text-white transition-colors font-mono text-xs"
        >
          PULAR_TUTORIAL [ESC]
        </button>
      </div>
    </div>
  );
}
