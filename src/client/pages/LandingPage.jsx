import React, { useState, useEffect } from 'react';
import { ArrowRight, BadgeCheck, Car, CheckCircle2, ChevronRight, MapPin, ShieldCheck, Sparkles, Star, WalletCards } from 'lucide-react';

const phrases = [
  "Keep the journey yours.",
  "Set your own trip price.",
  "Earn 100% of every fare.",
  "Experience zero commission."
];

const TypewriterText = () => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    let timer;

    if (!isDeleting && text.length < currentPhrase.length) {
      timer = setTimeout(() => {
        setText(currentPhrase.substring(0, text.length + 1));
      }, 65);
    } else if (!isDeleting && text.length === currentPhrase.length) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, 2200);
    } else if (isDeleting && text.length > 0) {
      timer = setTimeout(() => {
        setText(currentPhrase.substring(0, text.length - 1));
      }, 35);
    } else if (isDeleting && text.length === 0) {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timer);
  }, [text, isDeleting, phraseIndex]);

  return (
    <span className="inline-block text-emerald-400 min-h-[1.2em]">
      {text}
      <span className="animate-pulse border-r-4 border-emerald-400 ml-1 inline-block h-[0.8em] align-baseline rounded-full" />
    </span>
  );
};

export const LandingPage = ({ onAccess }) => (
  <section className="overflow-hidden">
    <div className="relative max-w-7xl mx-auto px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-16">
      <div className="absolute -right-44 top-0 h-[34rem] w-[34rem] rounded-full bg-emerald-400/10 blur-3xl" />
      <div className="relative grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr] lg:gap-16">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-extrabold tracking-wider text-emerald-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" /> A FAIRER WAY TO MOVE
          </div>
          
          <h1 className="mt-6 font-outfit text-4xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl min-h-[3.2em]">
            Choose your ride.<br />
            <TypewriterText />
          </h1>
          
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            NIBOLODA connects passengers with verified local drivers. Compare the driver, vehicle, arrival time, and fare before you book.
          </p>
          
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button onClick={() => onAccess('register')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-5 py-4 text-xs font-extrabold text-white shadow-glow transition hover:from-emerald-300 hover:to-emerald-500">
              GET STARTED <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={() => onAccess('login')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600/50 bg-emerald-950/50 px-5 py-4 text-xs font-extrabold text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-900/50">
              SIGN IN <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Upfront driver pricing</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Verified drivers</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> 0% trip commission</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-lg">
          <div className="absolute inset-4 rounded-[2rem] bg-emerald-500/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-emerald-400/25 bg-[linear-gradient(145deg,rgba(19,61,39,.96),rgba(4,23,14,.98))] p-5 shadow-2xl shadow-black/30 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center border border-emerald-500/30 bg-black/40 shadow-md p-0.5">
                  <img src="/niboloda-logo.png" alt="NIBOLODA" className="w-full h-full object-cover rounded-lg" />
                </div>
                <span className="font-outfit text-base font-extrabold tracking-tight"><span className="text-white">NIBO</span><span className="text-emerald-400">LODA</span></span>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">LIVE MARKETPLACE</span>
            </div>
            <div className="mt-6 rounded-2xl bg-slate-950/55 p-4">
              <p className="text-[10px] font-bold tracking-wider text-emerald-400">YOUR NEXT RIDE</p>
              <div className="mt-3 space-y-3">
                <Place icon={<MapPin className="h-4 w-4" />} title="Victoria Island" detail="Pickup" />
                <div className="ml-2 h-4 border-l border-dashed border-emerald-600/70" />
                <Place icon={<MapPin className="h-4 w-4 text-red-400" />} title="Ikeja City Mall" detail="Destination" />
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-emerald-600/25 bg-emerald-950/55 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-400/15 text-amber-400"><Car className="h-5 w-5" /></span>
                  <div>
                    <p className="text-xs font-bold text-white">John Adeyemi</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">Toyota Corolla · 4 min away</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-extrabold text-amber-400">₦4,800</p>
                  <p className="text-[10px] text-emerald-300">Driver's fare</p>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px]">
              <Metric value="4.9" label="Driver rating" />
              <Metric value="0%" label="Trip commission" />
              <Metric value="100%" label="Fare clarity" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="border-y border-emerald-800/45 bg-emerald-950/45">
      <div className="max-w-7xl mx-auto grid gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6">
        <Feature icon={<MapPin />} title="Passengers choose" text="See available drivers and select the right ride for your journey." />
        <Feature icon={<WalletCards />} title="Drivers earn fairly" text="Set your own trip pricing and keep your trip earnings." />
        <Feature icon={<ShieldCheck />} title="Trust is built in" text="Verification, clear trip records, and safety tools in one platform." />
      </div>
    </div>
  </section>
);

const Place = ({ icon, title, detail }) => <div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">{icon}</span><div><p className="text-xs font-bold text-white">{title}</p><p className="text-[10px] text-slate-400">{detail}</p></div></div>;
const Metric = ({ value, label }) => <div className="rounded-xl bg-emerald-900/35 py-2.5"><p className="font-outfit text-sm font-extrabold text-white">{value}</p><p className="mt-0.5 text-slate-400">{label}</p></div>;
const Feature = ({ icon, title, text }) => <div className="rounded-2xl border border-emerald-800/55 bg-emerald-950/35 p-5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">{icon}</span><h2 className="mt-4 font-outfit text-lg font-extrabold text-white">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-400">{text}</p></div>;
