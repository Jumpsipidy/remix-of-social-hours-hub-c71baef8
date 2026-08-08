import { createFileRoute } from '@tanstack/react-router';
import { Info, ArrowRight, ShieldCheck, Zap, Users, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/dashboard-kit';

export const Route = createFileRoute('/about-orgs')({
  component: AboutOrgsPage,
});

function AboutOrgsPage() {
  return (
    <div className="min-h-screen bg-[#0a0819] text-[#f5f3ff] selection:bg-primary/30">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-24 pb-16">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-primary/20 to-transparent blur-3xl opacity-50" />
        
        <div className="container relative mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-8">
              <Zap className="w-4 h-4" />
              <span>SKIRTA ORGANIZACIJOMS</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-black tracking-tight mb-6 leading-tight">
              Savanorystės valdymas,<br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">kuris nevargina.</span>
            </h1>
            
            <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10 leading-relaxed">
              Socialinės Valandos yra moderni platforma, jungianti aktyvius moksleivius su prasmę kuriančiomis organizacijomis. Pamirškite popierizmą ir susitelkite į poveikį.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard 
            icon={ShieldCheck}
            title="Skaidrumas ir saugumas"
            desc="Kiekviena valanda yra patvirtinama unikaliu QR kodu arba kintančiu 6 skaitmenų raktu. Jokių padirbtų parašų ar prarastų žurnalų."
          />
          <FeatureCard 
            icon={Zap}
            title="Momentinis patvirtinimas"
            desc="Valandos moksleivio paskyroje atsiranda tą pačią akimirką, kai jas patvirtinate. Automatiškai generuojami PDF sertifikatai taupo Jūsų laiką."
          />
          <FeatureCard 
            icon={Users}
            title="Tikslinė auditorija"
            desc="Pasiekite motyvuotus Šeduvos gimnazijos ir viso regiono moksleivius tiesiogiai. Skelbkite užduotis ir raskite pagalbininkų per kelias minutes."
          />
        </div>
      </div>

      {/* Process Steps */}
      <div className="bg-white/[0.02] border-y border-white/5 py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-display font-bold text-center mb-16 italic">Kaip tai veikia?</h2>
          
          <div className="grid md:grid-cols-4 gap-12 relative">
            <Step number="1" title="Registracija" desc="Susikurkite organizacijos profilį ir gaukite patvirtinimą." />
            <Step number="2" title="Užduotys" desc="Skelbkite savanorystės galimybes su datomis ir laiku." />
            <Step number="3" title="Rezervacija" desc="Moksleiviai rezervuoja vietas ir atvyksta pas Jus." />
            <Step number="4" title="Patvirtinimas" desc="Po veiklos nuskenuokite moksleivio QR kodą ir viskas!" />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-24 text-center">
        <GlassCard className="p-12 md:p-20 border-primary/20 max-w-4xl mx-auto overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-3xl rounded-full -mr-32 -mt-32" />
          
          <h2 className="text-4xl font-display font-black mb-6">Pasiruošę pradėti?</h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Platforma startuoja jau netrukus. Užsiregistruokite dabar ir būkite vieni pirmųjų matomų moksleiviams.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/register?role=organization" 
              className="px-10 py-5 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group"
            >
              Registruoti organizaciją
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </GlassCard>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 text-center text-white/30 text-sm">
        <p>© {new Date().getFullYear()} Socialinės Valandos. Visos teisės saugomos.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
  return (
    <GlassCard className="p-8 hover:border-primary/30 transition-colors group">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-white/50 leading-relaxed">{desc}</p>
    </GlassCard>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="relative">
      <div className="text-8xl font-display font-black text-white/[0.03] absolute -top-8 -left-4 pointer-events-none">{number}</div>
      <h4 className="text-xl font-bold mb-3 relative z-10">{title}</h4>
      <p className="text-white/40 leading-relaxed text-sm relative z-10">{desc}</p>
    </div>
  );
}
